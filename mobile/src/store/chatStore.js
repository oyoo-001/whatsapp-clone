import { create } from 'zustand';
import { messagesAPI } from '../services/api';
import socketService from '../services/socket';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeChat: null,
  messages: [],
  isLoading: false,
  isLoadingMessages: false,
  error: null,
  unreadCounts: {},

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await messagesAPI.getConversations();
      set({ conversations: data.conversations, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to load conversations' });
    }
  },

  fetchMessages: async (userId) => {
    set({ isLoadingMessages: true });
    try {
      const { data } = await messagesAPI.getMessages(userId);
      set({
        messages: data.messages,
        isLoadingMessages: false,
        activeChat: userId,
      });
      return data;
    } catch (error) {
      set({ isLoadingMessages: false, error: 'Failed to load messages' });
    }
  },

  listenToSocket: () => {
    const unsubMessage = socketService.on('chat:message', ({ from, message, user: msgUser }) => {
      const { activeChat, messages } = get();
      if (from === activeChat) {
        const exists = messages.find((m) => m.id === message.id || (m.content === message.content && m.senderId === message.senderId));
        if (!exists) {
          set({ messages: [...messages, message] });
        }
      }
      get().fetchConversations();
    });
    return unsubMessage;
  },

  loadMoreMessages: async (userId, before) => {
    try {
      const { data } = await messagesAPI.getMessages(userId, { before, limit: 30 });
      const currentMessages = get().messages;
      set({ messages: [...data.messages, ...currentMessages] });
      return data.hasMore;
    } catch (error) {
      console.error('Failed to load more messages:', error);
      return false;
    }
  },

  sendMessage: async (messageData) => {
    try {
      const { data } = await messagesAPI.sendMessage(messageData);
      const currentMessages = get().messages;
      set({ messages: [...currentMessages, data.message] });
      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },

  addMessage: (message) => {
    const { messages } = get();
    const exists = messages.find((m) => m.id === message.id);
    if (!exists) {
      set({ messages: [...messages, message] });
    }
  },

  markAsRead: async (userId) => {
    try {
      await messagesAPI.markAsRead(userId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  updateUnreadCount: (userId, count) => {
    const unreadCounts = { ...get().unreadCounts, [userId]: count };
    set({ unreadCounts });
  },

  clearActiveChat: () => {
    set({ activeChat: null, messages: [] });
  },
}));

export default useChatStore;
