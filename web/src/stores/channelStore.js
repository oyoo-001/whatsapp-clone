import { create } from 'zustand';
import { channelsAPI } from '../services/api';

const useChannelStore = create((set, get) => ({
  channels: [],
  loading: false,

  fetchChannels: async () => {
    set({ loading: true });
    try {
      const { data } = await channelsAPI.getMyChannels();
      set({ channels: data.channels || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createChannel: async (name, description) => {
    const { data } = await channelsAPI.create({ name, description });
    set((state) => ({ channels: [data.channel, ...state.channels] }));
    return data.channel;
  },

  followChannel: async (channelId) => {
    await channelsAPI.follow(channelId);
    set((state) => ({
      channels: state.channels.map((ch) =>
        String(ch.id) === String(channelId)
          ? { ...ch, isFollowing: true, followerCount: (ch.followerCount || 0) + 1 }
          : ch
      ),
    }));
  },

  unfollowChannel: async (channelId) => {
    await channelsAPI.unfollow(channelId);
    set((state) => ({
      channels: state.channels.map((ch) =>
        String(ch.id) === String(channelId)
          ? { ...ch, isFollowing: false, followerCount: Math.max(0, (ch.followerCount || 0) - 1) }
          : ch
      ),
    }));
  },

  getChannel: (channelId) => get().channels.find((ch) => String(ch.id) === String(channelId)),

  isFollowing: (channelId) => {
    const ch = get().channels.find((c) => String(c.id) === String(channelId));
    return ch ? ch.isFollowing || ch.isOwner : false;
  },
}));

export default useChannelStore;
