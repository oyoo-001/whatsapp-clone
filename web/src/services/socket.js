import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) return;
    this.socket = io('/', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    this.listeners.forEach((handlers, event) => {
      handlers.forEach((handler) => this.socket.on(event, handler));
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
}

export default new SocketService();
