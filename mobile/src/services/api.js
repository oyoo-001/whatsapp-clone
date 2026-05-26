import axios from 'axios';
import { Platform } from 'react-native';

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  ios: 'http://localhost:5000/api',
  default: 'http://localhost:5000/api',
});

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const usersAPI = {
  search: (query) => api.get(`/users/search?query=${query}`),
  getProfile: (userId) => api.get(`/users/${userId}`),
  getContacts: () => api.get('/users/contacts'),
  addContact: (data) => api.post('/users/contacts', data),
  removeContact: (contactId) => api.delete(`/users/contacts/${contactId}`),
  blockContact: (contactUserId) => api.put(`/users/contacts/${contactUserId}/block`),
};

export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId, params) => api.get(`/messages/${userId}`, { params }),
  sendMessage: (data) => api.post('/messages', data),
  markAsRead: (userId) => api.put(`/messages/${userId}/read`),
  addReaction: (messageId, reaction) =>
    api.put(`/messages/${messageId}/reaction`, { reaction }),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
};

export const callsAPI = {
  getHistory: (params) => api.get('/calls/history', { params }),
  getActiveMeetings: () => api.get('/calls/meetings/active'),
  initiateCall: (data) => api.post('/calls/initiate', data),
  updateCallStatus: (callId, status) =>
    api.put(`/calls/${callId}/status`, { callStatus: status }),
  joinMeeting: (callId) => api.post(`/calls/${callId}/join`),
};

export const getTURNCredentials = () => api.get('/turn-credentials');

export { BASE_URL };
export default api;
