export class TuChatWeb {
  async startForeground() { return; }
  async stopForeground() { return; }
  async showMessageNotification({ title, body, senderId, avatarUrl }) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: avatarUrl, tag: `msg_${senderId}` });
    }
    return;
  }
  async showIncomingCall({ callerName, callerId, channelName, avatarUrl }) {
    return;
  }
  async dismissIncomingCall({ callerId }) {
    return;
  }
}
