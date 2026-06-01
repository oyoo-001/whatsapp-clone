import axios from "axios";

const API_PREFIX = import.meta.env.VITE_API_URL || "http://192.168.0.102:5000";

const api = axios.create({
  baseURL: `${API_PREFIX}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) setAuthToken(null);
    return Promise.reject(err);
  },
);

export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
};

export const usersAPI = {
  search: (query) =>
    api.get(`/users/search?query=${encodeURIComponent(query)}`),
  searchByPhone: (phoneNumber) =>
    api.get(
      `/users/search-by-phone?phoneNumber=${encodeURIComponent(phoneNumber)}`,
    ),
  getProfile: (userId) => api.get(`/users/${userId}`),
  getContacts: () => api.get("/users/contacts"),
  addContact: (data) => api.post("/users/contacts", data),
  removeContact: (contactId) => api.delete(`/users/contacts/${contactId}`),
  blockContact: (contactUserId) =>
    api.put(`/users/contacts/${contactUserId}/block`),
};

export const messagesAPI = {
  getConversations: () => api.get("/messages/conversations"),
  getMessages: (userId, params) => api.get(`/messages/${userId}`, { params }),
  sendMessage: (data) => api.post("/messages", data),
  markAsRead: (userId) => api.put(`/messages/${userId}/read`),
  editMessage: (messageId, content) =>
    api.put(`/messages/${messageId}/edit`, { content }),
  deleteMessage: (messageId, mode) =>
    api.delete(`/messages/${messageId}?mode=${mode}`),
  forwardMessage: (messageId, receiverId) =>
    api.post("/messages/forward", { messageId, receiverId }),
  addReaction: (messageId, reaction) =>
    api.put(`/messages/${messageId}/reaction`, { reaction }),
  deleteConversation: (userId) =>
    api.delete(`/messages/conversation/${userId}`),
};

export const callsAPI = {
  initiateCall: (data) => api.post("/calls/initiate", data),
  updateCallStatus: (callId, status) =>
    api.put(`/calls/${callId}/status`, { callStatus: status }),
  getHistory: () => api.get("/calls/history"),
  joinMeeting: (callId) => api.post(`/calls/${callId}/join`),
};

export const groupsAPI = {
  create: (data) => api.post("/groups", data),
  getMyGroups: () => api.get("/groups"),
  getGroup: (id) => api.get(`/groups/${id}`),
  addMembers: (groupId, userIds) =>
    api.post(`/groups/${groupId}/members`, { userIds }),
  removeMember: (groupId, userId) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
  generateInviteCode: (groupId) =>
    api.post(`/groups/${groupId}/generate-invite`),
  regenerateInviteCode: (groupId) =>
    api.post(`/groups/${groupId}/regenerate-invite`),
  joinByInvite: (code) => api.post("/groups/join", { inviteCode: code }),
  getGroupByInviteCode: (code) => api.get(`/groups/invite/${code}`),
};

export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  listUsers: () => api.get("/admin/users"),
  banUser: (userId) => api.put(`/admin/users/${userId}/ban`),
  makeAdmin: (userId) => api.put(`/admin/users/${userId}/make-admin`),
  verifyUser: (userId) => api.put(`/admin/users/${userId}/verify`),
  broadcast: (data) => api.post("/admin/broadcast", data),
  getBroadcasts: () => api.get("/admin/broadcasts"),
  deleteBroadcast: (id) => api.delete(`/admin/broadcast/${id}`),
  listChannels: () => api.get("/admin/channels"),
  verifyChannel: (channelId) => api.put(`/admin/channels/${channelId}/verify`),
  getMessages: (userId) => api.get(`/admin/messages/${userId}`),
  sendMessage: (data) => api.post("/admin/messages", data),
  getSupportQueue: () => api.get("/admin/support/queue"),
  getSupportHistory: () => api.get("/admin/support/history"),
  claimTicket: (ticketId) =>
    api.post(`/admin/support/ticket/${ticketId}/claim`),
  resolveTicket: (ticketId) =>
    api.post(`/admin/support/ticket/${ticketId}/resolve`),
  getSupportTicketMessages: (ticketId) =>
    api.get(`/admin/support/ticket/${ticketId}/messages`),
  sendSupportMessage: (data) => api.post("/admin/support/message", data),
};

export const supportAPI = {
  createTicket: () => api.post("/support/ticket"),
  getMyTicket: () => api.get("/support/ticket"),
  getMessages: () => api.get("/support/messages"),
  sendMessage: (content) => api.post("/support/message", { content }),
};

export const getIceServers = () => api.get("/ice-servers");

export const channelsAPI = {
  create: (data) => api.post("/channels", data),
  getMyChannels: () => api.get("/channels"),
  exploreChannels: (q, limit = 10) =>
    api.get(`/channels/explore?q=${encodeURIComponent(q)}&limit=${limit}`),
  follow: (channelId) => api.post(`/channels/${channelId}/follow`),
  unfollow: (channelId) => api.delete(`/channels/${channelId}/follow`),
  getPosts: (channelId, page) =>
    api.get(`/channels/${channelId}/posts?page=${page}`),
  createPost: (channelId, data) =>
    api.post(`/channels/${channelId}/posts`, data),
  deleteChannel: (channelId) => api.delete(`/channels/${channelId}`),
  updateChannel: (channelId, data) => api.put(`/channels/${channelId}`, data),
  getChannel: (channelId) => api.get(`/channels/${channelId}`),
  joinByInvite: (code) => api.post("/channels/join", { inviteCode: code }),
  regenerateInviteCode: (channelId) =>
    api.post(`/channels/${channelId}/regenerate-invite`),
  getChannelByInviteCode: (code) => api.get(`/channels/invite/${code}`),
};

export const statusAPI = {
  createStatus: (data) => api.post("/status", data),
  getFeed: () => api.get("/status/feed"),
  getMyStatuses: () => api.get("/status/mine"),
  viewStatus: (statusId) => api.post(`/status/${statusId}/view`),
  getViewers: (statusId) => api.get(`/status/${statusId}/viewers`),
  deleteStatus: (statusId) => api.delete(`/status/${statusId}`),
};

export const linksAPI = {
  preview: (url) => api.post("/links/preview", { url }),
};

export const uploadAPI = {
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress,
      timeout: 120000,
    });
  },
};

export { api as default };
