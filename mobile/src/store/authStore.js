import { create } from 'zustand';
import { authAPI, setAuthToken } from '../services/api';
import socketService from '../services/socket';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (phoneNumber, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.login({ phoneNumber, password });
      setAuthToken(data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
      socketService.connect(data.token);
      return data;
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.register(userData);
      setAuthToken(data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
      socketService.connect(data.token);
      return data;
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  logout: () => {
    socketService.disconnect();
    setAuthToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const { data } = await authAPI.getMe();
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
      socketService.connect(data.token);
    } catch (error) {
      set({ isLoading: false });
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.updateProfile(profileData);
      set({ user: data.user, isLoading: false });
      return data;
    } catch (error) {
      const message = error.response?.data?.error || 'Update failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
