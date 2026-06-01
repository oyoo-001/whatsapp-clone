import { create } from 'zustand';
import { authAPI, setAuthToken } from '../services/api';
import socketService from '../services/socket';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  initialLoading: true,
  updateInfo: { required: false, downloadUrl: '' },

  setUpdateInfo: (info) => set({ updateInfo: info }),

  login: async (phoneNumber, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authAPI.login({ phoneNumber, password });
      setAuthToken(data.token);
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      socketService.connect(data.token);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (userData) => {
    set({ isLoading: true });
    try {
      const { data } = await authAPI.register(userData);
      setAuthToken(data.token);
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      socketService.connect(data.token);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    socketService.disconnect();
    setAuthToken(null);
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateProfile: async (profileData) => {
    const { data } = await authAPI.updateProfile(profileData);
    set({ user: data.user });
    return data;
  },

  loadUser: async () => {
    set({ initialLoading: true });
    const savedToken = localStorage.getItem('token');
    if (!savedToken) return set({ initialLoading: false });
    setAuthToken(savedToken);
    try {
      const { data } = await authAPI.getMe();
      set({ user: data.user, token: data.token, isAuthenticated: true, initialLoading: false });
      socketService.connect(data.token);
    } catch {
      localStorage.removeItem('token');
      set({ initialLoading: false });
    }
  },
}));

export default useAuthStore;
