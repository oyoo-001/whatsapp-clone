const { GroupMember } = require('../models');
const { sendCallPush } = require('../services/pushService');

const connectedUsers = new Map();
const rooms = new Map();

const webrtcHandlers = (io, socket) => {
  const userId = socket.userId;

  const getPeerSocket = (targetId) => {
    const sid = connectedUsers.get(targetId);
    return sid ? io.sockets.sockets.get(sid) : null;
  };

  socket.on('chat:typing', ({ to, isTyping }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('chat:typing', { from: userId, isTyping });
    }
  });

  socket.on('chat:group-typing', async ({ groupId, isTyping }) => {
    try {
      const members = await GroupMember.findAll({ where: { groupId } });
      members.forEach((m) => {
        if (m.userId !== userId) {
          io.to(`user-${m.userId}`).emit('chat:group-typing', { groupId, from: userId, isTyping, user: socket.userData });
        }
      });
    } catch (err) {
      console.error('Group typing relay error:', err);
    }
  });

  socket.on('chat:message', ({ to, message }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('chat:message', { from: userId, message, user: socket.userData });
    }
  });

  socket.on('chat:read', ({ to }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('chat:read', { from: userId });
    }
  });

  socket.on('call:start', ({ to, channelName, callType, startedAt }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:incoming', {
        from: userId,
        user: socket.userData,
        channelName,
        callType,
        startedAt,
      });
      io.to(socket.id).emit('call:ringing', { to, startedAt });
    } else {
      io.to(socket.id).emit('call:user-offline', { to });
      sendCallPush(to, socket.userData?.username || 'Unknown', channelName, callType);
    }
  });

  socket.on('call:accept', ({ to, channelName }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:accepted', { from: userId, user: socket.userData, channelName });
    }
  });

  socket.on('call:reject', ({ to }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:rejected', { from: userId });
    }
  });

  socket.on('call:timeout', ({ to }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:timedout', { from: userId });
    }
  });

  socket.on('call:end', ({ to }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:ended', { from: userId });
    }
  });

  socket.on('webrtc:offer', ({ to, sdp }) => {
    const peerSocket = connectedUsers.get(to);
    if (peerSocket) {
      io.to(peerSocket).emit('webrtc:offer', { from: userId, sdp });
    }
  });

  socket.on('webrtc:answer', ({ to, sdp }) => {
    const peerSocket = connectedUsers.get(to);
    if (peerSocket) {
      io.to(peerSocket).emit('webrtc:answer', { from: userId, sdp });
    }
  });

  socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
    const peerSocket = connectedUsers.get(to);
    if (peerSocket) {
      io.to(peerSocket).emit('webrtc:ice-candidate', { from: userId, candidate });
    }
  });

  const config = require('../config/config');

  socket.on('webrtc:group-join', ({ channel }) => {
    if (!rooms.has(channel)) {
      rooms.set(channel, new Map());
    }
    const room = rooms.get(channel);
    if (room.has(userId)) {
      socket.emit('webrtc:room-users', { users: Array.from(room.values()).map((u) => ({ userId: u.userId, user: u.userData })) });
      return;
    }

    const max = config.maxGroupParticipants;
    if (room.size >= max) {
      socket.emit('webrtc:room-full', { max, message: `Group call is full (max ${max} participants).` });
      return;
    }

    room.set(userId, { userId, userData: socket.userData, socketId: socket.id });
    socket.join(`webrtc:${channel}`);

    const existingUsers = Array.from(room.values())
      .filter((u) => u.userId !== userId)
      .map((u) => ({ userId: u.userId, user: u.userData }));

    socket.emit('webrtc:room-users', { users: existingUsers });
    socket.to(`webrtc:${channel}`).emit('webrtc:group-user-joined', { userId, user: socket.userData });
  });

  socket.on('webrtc:group-leave', ({ channel }) => {
    const room = rooms.get(channel);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        rooms.delete(channel);
      }
    }
    socket.leave(`webrtc:${channel}`);
    socket.to(`webrtc:${channel}`).emit('webrtc:group-user-left', { userId });
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, channel) => {
      if (room.has(userId)) {
        room.delete(userId);
        if (room.size === 0) {
          rooms.delete(channel);
        } else {
          io.to(`webrtc:${channel}`).emit('webrtc:group-user-left', { userId });
        }
      }
    });
  });
};

module.exports = { webrtcHandlers, connectedUsers, rooms };
