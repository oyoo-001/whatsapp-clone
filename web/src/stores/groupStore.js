import { create } from 'zustand';
import { groupsAPI } from '../services/api';

const useGroupStore = create((set, get) => ({
  groups: [],
  groupMessages: {},
  loading: false,

  fetchGroups: async () => {
    set({ loading: true });
    try {
      const { data } = await groupsAPI.getMyGroups();
      set({ groups: data.groups || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createGroup: async (name) => {
    const { data } = await groupsAPI.create({ name });
    set((state) => ({ groups: [data.group, ...state.groups] }));
    return data.group;
  },

  updateGroup: async (groupId, updates) => {
    const { data } = await groupsAPI.update(groupId, updates);
    set((state) => ({
      groups: state.groups.map((g) => (String(g.id) === String(groupId) ? data.group : g)),
    }));
    return data.group;
  },

  updateAvatar: async (groupId, avatar) => {
    const { data } = await groupsAPI.updateAvatar(groupId, { avatar });
    set((state) => ({
      groups: state.groups.map((g) =>
        String(g.id) === String(groupId) ? { ...g, avatar: data.avatar } : g
      ),
    }));
    return data.avatar;
  },

  addMembers: async (groupId, userIds) => {
    const { data } = await groupsAPI.addMembers(groupId, { userIds });
    return data.members;
  },

  removeMember: async (groupId, userId) => {
    await groupsAPI.removeMember(groupId, userId);
    set((state) => ({
      groups: state.groups.map((g) =>
        String(g.id) === String(groupId)
          ? { ...g, participants: g.participants.filter((p) => String(p.id) !== String(userId)) }
          : g
      ),
    }));
  },

  exitGroup: async (groupId) => {
    await groupsAPI.exit(groupId);
    set((state) => ({
      groups: state.groups.filter((g) => String(g.id) !== String(groupId)),
    }));
  },

  getGroup: (groupId) => get().groups.find((g) => String(g.id) === String(groupId)),

  updateMemberRole: async (groupId, userId) => {
    await groupsAPI.updateMemberRole(groupId, userId);
    set((state) => ({
      groups: state.groups.map((g) =>
        String(g.id) === String(groupId)
          ? {
              ...g,
              participants: g.participants.map((p) =>
                String(p.id) === String(userId)
                  ? { ...p, GroupMember: { ...p.GroupMember, role: 'admin' } }
                  : p
              ),
            }
          : g
      ),
    }));
  },

  addMessage: async (groupId, sender, content, messageType = 'text', fileUrl = null, replyTo = null) => {
    const payload = { content, messageType, fileUrl };
    if (replyTo) {
      payload.replyToId = replyTo.id;
      payload.replyToContent = replyTo.content || replyTo.replyToContent || '';
      payload.replyToSenderId = replyTo.sender?.id || replyTo.senderId || sender.id;
      payload.replyToSenderName = replyTo.sender?.username || replyTo.senderName || sender.username;
    }
    const { data } = await groupsAPI.sendMessage(groupId, payload);
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: [...(state.groupMessages[groupId] || []), data.message],
      },
      groups: state.groups.map((g) =>
        String(g.id) === String(groupId)
          ? { ...g, messages: [data.message], updatedAt: new Date().toISOString() }
          : g
      ),
    }));
    return data.message;
  },

  fetchMessages: async (groupId) => {
    try {
      const { data } = await groupsAPI.getMessages(groupId);
      set((state) => ({
        groupMessages: { ...state.groupMessages, [groupId]: data.messages || [] },
      }));
    } catch {}
  },

  receiveMessage: (groupId, message) => {
    set((state) => {
      const existing = state.groupMessages[groupId] || [];
      if (existing.some((m) => String(m.id) === String(message.id))) return state;
      return {
        groupMessages: {
          ...state.groupMessages,
          [groupId]: [...existing, message],
        },
        groups: state.groups.map((g) =>
          String(g.id) === String(groupId)
            ? { ...g, messages: [message], updatedAt: new Date().toISOString() }
            : g
        ),
      };
    });
  },

  removeMessage: (groupId, messageId) => {
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: (state.groupMessages[groupId] || []).filter((m) => String(m.id) !== String(messageId)),
      },
    }));
  },

  markAsRead: async (groupId) => {
    try {
      await groupsAPI.markAsRead(groupId);
    } catch {}
  },

  deleteMessage: async (groupId, messageId) => {
    await groupsAPI.deleteMessage(groupId, { messageId });
    set((state) => ({
      groupMessages: {
        ...state.groupMessages,
        [groupId]: (state.groupMessages[groupId] || []).filter((m) => String(m.id) !== String(messageId)),
      },
    }));
  },

  getMessages: (groupId) => get().groupMessages[groupId] || [],

  getSortedGroups: () => {
    const all = get().groups;
    return [...all].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  },
}));

export default useGroupStore;
