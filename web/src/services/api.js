import axios from 'axios';

const API_PREFIX = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_PREFIX}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) setAuthToken(null);
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const usersAPI = {
  search: (query) => api.get(`/users/search?query=${encodeURIComponent(query)}`),
  searchByPhone: (phoneNumber) => api.get(`/users/search-by-phone?phoneNumber=${encodeURIComponent(phoneNumber)}`),
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
  editMessage: (messageId, content) => api.put(`/messages/${messageId}/edit`, { content }),
  deleteMessage: (messageId, mode) => api.delete(`/messages/${messageId}?mode=${mode}`),
  forwardMessage: (messageId, receiverId) => api.post('/messages/forward', { messageId, receiverId }),
  addReaction: (messageId, reaction) => api.put(`/messages/${messageId}/reaction`, { reaction }),
};

export const callsAPI = {
  initiateCall: (data) => api.post('/calls/initiate', data),
  updateCallStatus: (callId, status) => api.put(`/calls/${callId}/status`, { callStatus: status }),
  getHistory: () => api.get('/calls/history'),
  joinMeeting: (callId) => api.post(`/calls/${callId}/join`),
};

export const groupsAPI = {
  createGroup: (data) => api.post('/groups', data),
  getMyGroups: () => api.get('/groups'),
  getGroup: (groupId) => api.get(`/groups/${groupId}`),
  updateGroup: (groupId, data) => api.put(`/groups/${groupId}`, data),
  updateAvatar: (groupId, data) => api.put(`/groups/${groupId}/avatar`, data),
  addMembers: (groupId, data) => api.post(`/groups/${groupId}/members`, data),
  addMember: (groupId, data) => api.post(`/groups/${groupId}/members/add`, data),
  removeMember: (groupId, data) => api.delete(`/groups/${groupId}/members`, { data }),
  updateMemberRole: (groupId, userId) => api.put(`/groups/${groupId}/members/${userId}/role`),
  sendMessage: (groupId, data) => api.post(`/groups/${groupId}/messages`, data),
  getMessages: (groupId, params) => api.get(`/groups/${groupId}/messages`, { params }),
  deleteMessage: (groupId, data) => api.delete(`/groups/${groupId}/messages`, { data }),
  markAsRead: (groupId) => api.put(`/groups/${groupId}/read`),
};

export const uploadAPI = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
      timeout: 120000,
    });
  },
};

export { api as default };
