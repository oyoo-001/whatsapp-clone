const PREFIX = 'wac:';

export const cacheService = {
  _set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
  },
  _get(key) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  _remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  getConversations() { return this._get('conversations'); },
  setConversations(data) { this._set('conversations', data); },
  getMessages(userId) { return this._get(`msgs:${userId}`); },
  setMessages(userId, data) { this._set(`msgs:${userId}`, data); },

  getPendingMessages() { return this._get('pending') || []; },
  setPendingMessages(queue) { this._set('pending', queue); },
  addPendingMessage(msg) {
    const q = this.getPendingMessages();
    q.push(msg);
    this.setPendingMessages(q);
  },
  removePendingMessage(tempId) {
    this.setPendingMessages(this.getPendingMessages().filter(m => m._tempId !== tempId));
  },

  clear() {
    Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k));
  },

  isOnline() { return navigator.onLine; },
};
