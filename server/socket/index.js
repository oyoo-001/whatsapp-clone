const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');
const { webrtcHandlers, connectedUsers, meetingRooms, activeCallUsers } = require('./webrtcHandlers');

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findByPk(decoded.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.userData = {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
      };

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userData.username} (${socket.id})`);

    connectedUsers.set(socket.userId, socket.id);
    socket.join(`user-${socket.userId}`);

    await User.update(
      { isOnline: true, lastSeen: new Date() },
      { where: { id: socket.userId } }
    );

  io.emit('user:status', {
        userId: socket.userId,
        isOnline: true,
      });

    webrtcHandlers(io, socket);

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userData.username}`);
      connectedUsers.delete(socket.userId);
      activeCallUsers.delete(socket.userId);

      for (const [meetingId, room] of meetingRooms) {
        if (room.has(socket.userId)) {
          room.delete(socket.userId);
          io.to(`meeting:${meetingId}`).emit('meeting:user-left', { userId: socket.userId });
          if (room.size === 0) {
            meetingRooms.delete(meetingId);
          }
        }
      }

      await User.update(
        { isOnline: false, lastSeen: new Date() },
        { where: { id: socket.userId } }
      );

      io.emit('user:status', {
        userId: socket.userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    });
  });
};

module.exports = { setupSocket, connectedUsers };
