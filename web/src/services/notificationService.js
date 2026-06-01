import TuChat from '../plugins/tuchat';
import socketService from './socket';
import useAuthStore from '../stores/authStore';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

class NotificationService {
  constructor() {
    this.initialized = false;
    this.queuedCall = null;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    const isNative = Capacitor.isNativePlatform();
    if (!isNative) return;

    try {
      await LocalNotifications.requestPermissions();
      await PushNotifications.requestPermissions();
      const permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
        PushNotifications.addListener('registration', (token) => {
          this.sendTokenToServer(token.value);
        });
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          this.handlePushData(notification.data);
        });
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          this.handlePushData(action.notification.data);
        });
      }
    } catch (err) {
      console.warn('Notification init error:', err);
    }

    try {
      await TuChat.startForeground();
    } catch (err) {
      console.warn('Foreground service start error:', err);
    }

    this.registerSocketListeners();
  }

  registerSocketListeners() {
    socketService.on('chat:message', async ({ sender, content, messageType, receiverId }) => {
      const user = useAuthStore.getState().user;
      if (!user || receiverId !== user.id) return;
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        try {
          await LocalNotifications.schedule({
            notifications: [{
              title: sender?.username || 'Unknown',
              body: messageType === 'text' ? content : `[${messageType}]`,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 100), allowWhileIdle: true },
              smallIcon: 'ic_stat_name',
              largeIcon: sender?.avatar,
              extra: { senderId: sender?.id, chatUserId: sender?.id },
              actionTypeId: 'OPEN_CHAT',
              sound: 'message_sound.wav',
              attachments: null,
              actionGroups: null,
              summaryText: null,
              group: 'messages',
            }],
          });
        } catch {}
      } else {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(sender?.username || 'Unknown', {
            body: messageType === 'text' ? content : `[${messageType}]`,
            icon: sender?.avatar,
            tag: `msg_${sender?.id}`,
          });
        }
      }
    });

    socketService.on('call:incoming', async ({ from, channelName, callType, username, callerName }) => {
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        try {
          await TuChat.showIncomingCall({
            callerName: callerName || username || 'Unknown',
            callerId: from,
            channelName,
            avatarUrl: '',
          });
        } catch {}
      }
      this.queuedCall = { from, channelName, callType, username, callerName };
    });

    socketService.on('call:ended', async ({ from }) => {
      if (this.queuedCall && this.queuedCall.from === from) {
        this.queuedCall = null;
      }
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        try {
          await TuChat.dismissIncomingCall({ callerId: from });
        } catch {}
      }
    });
  }

  async sendTokenToServer(token) {
    try {
      const { default: api } = await import('./api');
      await api.post('/notifications/register-token', { token, platform: 'android' });
    } catch {}
  }

  handlePushData(data) {
    if (!data) return;
    if (data.type === 'call' && data.channelName) {
      this.queuedCall = {
        from: data.callerId,
        channelName: data.channelName,
        callType: data.callType || 'voice',
        username: data.callerName,
      };
      window.__queuedCall = this.queuedCall;
    } else if (data.type === 'message' && data.senderId) {
      if (window.__navigateToChat) {
        window.__navigateToChat(parseInt(data.senderId));
      }
    }
  }

  getQueuedCall() {
    return this.queuedCall;
  }

  clearQueuedCall() {
    this.queuedCall = null;
  }

  async dismissCall(callerId) {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      try {
        await TuChat.dismissIncomingCall({ callerId });
      } catch {}
    }
  }

  async showCallNotification(callerName, callerId, channelName) {
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      try {
        await TuChat.showIncomingCall({ callerName, callerId, channelName, avatarUrl: '' });
      } catch {}
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;
