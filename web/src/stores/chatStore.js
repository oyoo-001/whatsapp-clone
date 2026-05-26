import { create } from 'zustand';
import { messagesAPI } from '../services/api';
import socketService from '../services/socket';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeChat: null,
  messages: [],
  isLoading: false,
  isLoadingMessages: false,
  replyTo: null,
  editMessage: null,
  forwardMessage: null,

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const { data } = await messagesAPI.getConversations();
      set({ conversations: data.conversations, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  fetchMessages: async (userId) => {
    set({ isLoadingMessages: true });
    try {
      const { data } = await messagesAPI.getMessages(userId);
      set({ messages: data.messages, isLoadingMessages: false, activeChat: userId });
    } catch { set({ isLoadingMessages: false }); }
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
    const payload = { ...messageData };
    if (replyTo) {
      payload.replyToId = replyTo.id;
      payload.replyToContent = replyTo.content;
    }
    const { data } = await messagesAPI.sendMessage(payload);
    set({ messages: [...get().messages, data.message], replyTo: null });
    return data;
  },

  addMessage: (message) => {
    const { messages, activeChat } = get();
    if (message.senderId !== activeChat && message.receiverId !== activeChat) return;
    const exists = messages.find((m) => m.id === message.id);
    if (!exists) set({ messages: [...messages, message] });
  },

  markAsRead: async (userId) => {
    try { await messagesAPI.markAsRead(userId); } catch {}
  },

  updateMessageInStore: (messageId, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
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

  deleteMessageAction: async (messageId, mode) => {
    await messagesAPI.deleteMessage(messageId, mode);
    if (mode === 'me') {
      get().updateMessageInStore(messageId, { content: null, fileUrl: null, messageType: 'text', isDeleted: true });
    } else {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== messageId),
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
      get().updateMessageInStore(data.messageId, { isDelivered: true });
    });

    socketService.on('chat:read', () => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.senderId === state.activeChat && !m.isRead
            ? { ...m, isRead: true, isDelivered: true }
            : m
        ),
      }));
    });

    socketService.on('chat:edited', (data) => {
      get().updateMessageInStore(data.messageId, data);
    });

    socketService.on('chat:deleted', (data) => {
      if (data.mode === 'all') {
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== data.messageId),
        }));
      } else {
        get().updateMessageInStore(data.messageId, { content: null, fileUrl: null, messageType: 'text', isDeleted: true });
      }
    });
  },

  clearActiveChat: () => set({ activeChat: null, messages: [], replyTo: null, editMessage: null, forwardMessage: null }),
}));

export default useChatStore;