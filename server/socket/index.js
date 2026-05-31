const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');
const { webrtcHandlers, connectedUsers } = require('./webrtcHandlers');

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);

      // Support ticket auth for banned users
      if (decoded.scope === 'banned-support') {
        const user = await User.findByPk(decoded.userId);
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
        socket.isBannedSupport = true;
        socket.ticketId = decoded.ticketId;
        return next();
      }

      // Normal user auth
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
    console.log(`${socket.isBannedSupport ? '[Banned Support]' : ''} User connected: ${socket.userData.username} (${socket.id})`);

    if (socket.isBannedSupport) {
      // Banned user connects only to their ticket room
      socket.join(`ticket-${socket.ticketId}`);
      console.log(`Banned user ${socket.userData.username} joined ticket-${socket.ticketId}`);
      return;
    }

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
