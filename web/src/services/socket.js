import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://tuconnect.onrender.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this._reconnectCallbacks = new Set();
  }

  connect(token) {
    if (this.socket?.connected) return;
    this.socket = io(SOCKET_URL || '/', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    this.socket.on('connect', () => {
      this._reconnectCallbacks.forEach((cb) => cb());
    });
  }

  disconnect() {
    if (this.socket) { this.socket.disconnect(); this.socket = null; }
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    if (this.socket) this.socket.on(event, handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.socket) this.socket.off(event, handler);
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) this.listeners.delete(event);
    }
  }

  emit(event, data) {
    if (this.socket?.connected) this.socket.emit(event, data);
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  onReconnect(cb) {
    this._reconnectCallbacks.add(cb);
    return () => this._reconnectCallbacks.delete(cb);
  }
}

export default new SocketService();
