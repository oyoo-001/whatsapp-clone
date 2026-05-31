import { create } from 'zustand';
import { messagesAPI, adminAPI } from '../services/api';
import socketService from '../services/socket';
import { cacheService } from '../services/cacheService';
import useAuthStore from './authStore';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeChat: null,
  messages: [],
  isLoading: false,
  isLoadingMessages: false,
  replyTo: null,
  editMessage: null,
  forwardMessage: null,

  fetchConversations: async (background = false) => {
    if (!background && get().conversations.length === 0) {
      const cached = cacheService.getConversations();
      if (cached) set({ conversations: cached });
      set({ isLoading: true });
    }
    try {
      const { data } = await messagesAPI.getConversations();
      cacheService.setConversations(data.conversations);
      set({ conversations: data.conversations, isLoading: false });
    } catch {
      const cached = cacheService.getConversations();
      if (cached && get().conversations.length === 0) set({ conversations: cached });
      set({ isLoading: false });
    }
  },

  updateConversationLastMessage: (userId, message, sender) => {
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.user.id === userId);
      if (idx >= 0) {
        const conv = state.conversations[idx];
        const list = [...state.conversations];
        list.splice(idx, 1);
        list.unshift({ ...conv, lastMessage: message, unreadCount: (conv.unreadCount || 0) + 1 });
        return { conversations: list };
      }
      return { conversations: [{ user: sender || { id: userId, username: 'User' }, lastMessage: message, unreadCount: 1 }, ...state.conversations] };
    });
  },

  updateConversationStatus: (userId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.user.id === userId && c.lastMessage
          ? { ...c, lastMessage: { ...c.lastMessage, ...updates } }
          : c
      ),
    }));
  },

  updateUserStatus: (userId, isOnline) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.user.id === userId
          ? { ...c, user: { ...c.user, isOnline } }
          : c
      ),
    }));
  },

  fetchMessages: async (userId) => {
    set({ isLoadingMessages: true });
    try {
      const { data } = await messagesAPI.getMessages(userId);
      cacheService.setMessages(userId, data.messages);
      set({ messages: data.messages, isLoadingMessages: false, activeChat: userId });
    } catch {
      const cached = cacheService.getMessages(userId);
      set({ messages: cached || [], isLoadingMessages: false, activeChat: userId });
    }
  },

  loadMoreMessages: async (userId, before) => {
    try {
      const { data } = await messagesAPI.getMessages(userId, { before, limit: 30 });
      set({ messages: [...data.messages, ...get().messages] });
      return data.hasMore;
    } catch { return false; }
  },

  sendMessage: async (messageData) => {
    const { replyTo } = get();
    const currentUser = useAuthStore.getState().user;
    const payload = { ...messageData };
    if (replyTo) {
      payload.replyToId = replyTo.id;
      payload.replyToContent = replyTo.content;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempMessage = {
      id: tempId,
      _tempId: tempId,
      _sending: true,
      senderId: currentUser.id,
      receiverId: payload.receiverId,
      content: payload.content || null,
      messageType: payload.messageType || 'text',
      fileUrl: payload.fileUrl || null,
      fileSize: payload.fileSize || null,
      mimeType: payload.mimeType || null,
      replyToId: payload.replyToId || null,
      replyToContent: payload.replyToContent || null,
      isEdited: false,
      isDelivered: false,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({ messages: [...state.messages, tempMessage], replyTo: null }));

    if (!navigator.onLine) {
      cacheService.addPendingMessage({ ...tempMessage, _payload: payload });
      set((state) => ({
        messages: state.messages.map((m) =>
          m._tempId === tempId ? { ...m, _sending: false, _offline: true } : m
        ),
      }));
      return { message: tempMessage, offline: true };
    }

    try {
      const { data } = await messagesAPI.sendMessage(payload);
      set((state) => ({
        messages: state.messages.map((m) =>
          m._tempId === tempId ? { ...data.message, _tempId: undefined } : m
        ),
      }));
      cacheService.setMessages(payload.receiverId, get().messages);
      return data;
    } catch (err) {
      cacheService.addPendingMessage({ ...tempMessage, _payload: payload });
      set((state) => ({
        messages: state.messages.map((m) =>
          m._tempId === tempId ? { ...m, _sending: false, _failed: true } : m
        ),
      }));
      throw err;
    }
  },

  addMessage: (message) => {
    const { messages, activeChat } = get();
    if (message.senderId !== activeChat && message.receiverId !== activeChat) return;
    const exists = messages.find((m) => m.id === message.id);
    if (exists) return;
    const tempMatch = messages.find((m) =>
      m._tempId &&
      m.senderId === message.senderId &&
      m.receiverId === message.receiverId &&
      m.content === message.content &&
      m.messageType === message.messageType
    );
    if (tempMatch) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._tempId === tempMatch._tempId ? { ...message, _tempId: undefined } : m
        ),
      }));
      return;
    }
    set({ messages: [...messages, message] });
  },

  retrySendMessage: async (failedMessage) => {
    const payload = {
      receiverId: failedMessage.receiverId,
      content: failedMessage.content,
      messageType: failedMessage.messageType,
      fileUrl: failedMessage.fileUrl,
      fileSize: failedMessage.fileSize,
      mimeType: failedMessage.mimeType,
      replyToId: failedMessage.replyToId,
      replyToContent: failedMessage.replyToContent,
    };
    set((state) => ({
      messages: state.messages.filter((m) => m._tempId !== failedMessage._tempId),
    }));
    return get().sendMessage(payload);
  },

  processPendingMessages: async () => {
    const pending = cacheService.getPendingMessages();
    if (pending.length === 0) return;
    for (const p of pending) {
      try {
        const { _payload } = p;
        const { data } = await messagesAPI.sendMessage(_payload);
        set((state) => ({
          messages: state.messages.map((m) =>
            m._tempId === p._tempId ? { ...data.message, _tempId: undefined } : m
          ),
        }));
        cacheService.removePendingMessage(p._tempId);
      } catch {}
    }
  },

  markAsRead: async (userId) => {
    try { await messagesAPI.markAsRead(userId); } catch {}
  },

  updateMessageInStore: (messageId, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId || m._tempId === messageId ? { ...m, ...updates } : m
      ),
      conversations: state.conversations.map((c) =>
        c.lastMessage?.id === messageId
          ? { ...c, lastMessage: { ...c.lastMessage, ...updates } }
          : c
      ),
    }));
  },

  editMessageAction: async (messageId, content) => {
    await messagesAPI.editMessage(messageId, content);
    get().updateMessageInStore(messageId, { content, isEdited: true });
    set({ editMessage: null });
  },

  deleteMessageAction: async (messageId, mode, message) => {
    if (message?.isBroadcast) {
      const bcId = String(messageId).replace('bc-', '');
      await adminAPI.deleteBroadcast(bcId);
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== messageId),
      }));
      return;
    }
    await messagesAPI.deleteMessage(messageId, mode);
    if (mode === 'me') {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== messageId && m._tempId !== messageId),
      }));
    } else {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== messageId && m._tempId !== messageId),
      }));
    }
  },

  forwardMessageAction: async (messageId, receiverId) => {
    const { data } = await messagesAPI.forwardMessage(messageId, receiverId);
    set({ forwardMessage: null });
    return data;
  },

  setReplyTo: (msg) => set({ replyTo: msg }),
  setEditMessage: (msg) => set({ editMessage: msg }),
  setForwardMessage: (msg) => set({ forwardMessage: msg }),

  setupSocketListeners: () => {
    socketService.on('chat:delivered', (data) => {
      if (data?.bulk) {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.senderId === state.activeChat && !m.isDelivered
              ? { ...m, isDelivered: true }
              : m
          ),
        }));
      } else if (data?.messageId) {
        get().updateMessageInStore(data.messageId, { isDelivered: true });
      }
    });

    socketService.on('chat:read', ({ byUserId }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          (m.senderId === state.activeChat || m.receiverId === state.activeChat) && !m.isRead
            ? { ...m, isRead: true, isDelivered: true }
            : m
        ),
        conversations: state.conversations.map((c) =>
          c.lastMessage && !c.lastMessage.isRead
            ? { ...c, lastMessage: { ...c.lastMessage, isRead: true, isDelivered: true } }
            : c
        ),
      }));
    });

    socketService.on('chat:edited', (data) => {
      get().updateMessageInStore(data.messageId, data);
    });

    socketService.on('chat:deleted', (data) => {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== data.messageId && m._tempId !== data.messageId),
      }));
    });
  },

  deleteConversation: async (userId) => {
    try {
      await messagesAPI.deleteConversation(userId);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.user.id !== userId),
        messages: state.messages.filter((m) => m.senderId !== userId && m.receiverId !== userId),
        activeChat: state.activeChat === userId ? null : state.activeChat,
      }));
      cacheService.removeConversation?.(userId);
    } catch {}
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId && m._tempId !== messageId),
    }));
  },

  clearActiveChat: () => set({ activeChat: null, messages: [], replyTo: null, editMessage: null, forwardMessage: null }),
}));

export default useChatStore;