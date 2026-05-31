import { create } from 'zustand';
import { statusAPI } from '../services/api';

const useStatusStore = create((set, get) => ({
  statusGroups: [],
  myStatuses: [],
  loading: false,

  fetchStatusFeed: async () => {
    set({ loading: true });
    try {
      const { data } = await statusAPI.getFeed();
      set({ statusGroups: data.statusGroups || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchMyStatuses: async () => {
    try {
      const { data } = await statusAPI.getMyStatuses();
      set({ myStatuses: data.statuses || [] });
    } catch {}
  },

  createStatus: async ({ content, mediaUrl, mediaType, backgroundColor }) => {
    const { data } = await statusAPI.createStatus({ content, mediaUrl, mediaType, backgroundColor });
    set((state) => ({
      myStatuses: [data.status, ...state.myStatuses],
      statusGroups: (() => {
        const existing = [...state.statusGroups];
        const myIdx = existing.findIndex(g => g.user?.id === data.status.userId);
        if (myIdx >= 0) {
          existing[myIdx] = { ...existing[myIdx], statuses: [data.status, ...existing[myIdx].statuses] };
        } else {
          existing.unshift({ user: data.status.user, statuses: [data.status] });
        }
        return existing;
      })(),
    }));
    return data.status;
  },

  deleteStatus: async (statusId) => {
    await statusAPI.deleteStatus(statusId);
    set((state) => ({
      myStatuses: state.myStatuses.filter((s) => String(s.id) !== String(statusId)),
      statusGroups: state.statusGroups
        .map((g) => ({ ...g, statuses: g.statuses.filter((s) => String(s.id) !== String(statusId)) }))
        .filter((g) => g.statuses.length > 0),
    }));
  },
}));

export default useStatusStore;
