const notificationController = require('../controllers/notificationController');

let fcmAvailable = false;
let firebaseAdmin = null;

try {
  const serviceAccount = process.env.FCM_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FCM_SERVICE_ACCOUNT)
    : null;
  if (serviceAccount) {
    firebaseAdmin = require('firebase-admin');
    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
      });
    }
    fcmAvailable = true;
    console.log('FCM push notifications initialized');
  }
} catch (err) {
  console.log('FCM not configured — push notifications disabled:', err.message);
}

const sendPushToUser = async (userId, payload) => {
  if (!fcmAvailable) return false;
  try {
    const tokens = await notificationController.getUserTokens(userId);
    if (tokens.length === 0) return false;

    const message = {
      tokens,
      notification: payload.notification,
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: payload.channelId || 'tuchat_messages',
          priority: 'high',
          visibility: 'public',
          ...(payload.fullScreen ? {
            fullScreenIntent: true,
            priority: 'max',
            category: 'call',
          } : {}),
        },
      },
    };

    const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
    return response.successCount > 0;
  } catch (err) {
    console.error('Push send error:', err.message);
    return false;
  }
};

const sendMessagePush = async (sender, receiverId, content, messageType) => {
  return sendPushToUser(receiverId, {
    notification: {
      title: sender?.username || 'Unknown',
      body: messageType === 'text' ? content : `[${messageType}]`,
    },
    data: {
      type: 'message',
      senderId: String(sender?.id || ''),
      senderName: sender?.username || 'Unknown',
      messageType,
    },
    channelId: 'tuchat_messages',
  });
};

const sendCallPush = async (callerId, callerName, channelName, callType) => {
  return sendPushToUser(callerId, {
    notification: {
      title: callerName || 'Incoming Call',
      body: `${callType === 'video' ? 'Video' : 'Voice'} call...`,
    },
    data: {
      type: 'call',
      callerId: String(callerId),
      callerName: callerName || 'Unknown',
      channelName,
      callType: callType || 'voice',
    },
    channelId: 'tuchat_calls',
    fullScreen: true,
  });
};

module.exports = { sendMessagePush, sendCallPush, fcmAvailable };
