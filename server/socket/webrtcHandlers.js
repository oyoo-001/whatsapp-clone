const connectedUsers = new Map();
const meetingRooms = new Map();
const activeCallUsers = new Map(); // userId -> { peerId, callType, callLogId }

const webrtcHandlers = (io, socket) => {
  const userId = socket.userId;

  socket.on('signal:offer', ({ to, offer }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('signal:offer', {
        from: userId,
        offer,
        user: socket.userData,
      });
    }
  });

  socket.on('signal:answer', ({ to, answer }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('signal:answer', {
        from: userId,
        answer,
      });
    }
  });

  socket.on('signal:ice-candidate', ({ to, candidate }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('signal:ice-candidate', {
        from: userId,
        candidate,
      });
    }
  });

  socket.on('call:start', ({ to, callType, callLogId }) => {
    const targetSocket = connectedUsers.get(to);

    if (activeCallUsers.has(to)) {
      if (targetSocket) {
        io.to(targetSocket).emit('call:waiting', {
          from: userId,
          callType,
          callLogId,
          user: socket.userData,
        });
      }
      io.to(socket.id).emit('call:busy', { to });
      return;
    }

    if (targetSocket) {
      io.to(targetSocket).emit('call:incoming', {
        from: userId,
        callType,
        callLogId,
        user: socket.userData,
      });
      io.to(socket.id).emit('call:ringing', { to });
    } else {
      io.to(socket.id).emit('call:user-offline', { to });
    }
  });

  socket.on('call:accept', ({ to }) => {
    const targetSocket = connectedUsers.get(to);
    const connectedAt = Date.now();

    activeCallUsers.set(userId, { peerId: to, connectedAt });
    activeCallUsers.set(to, { peerId: userId, connectedAt });

    if (targetSocket) {
      io.to(targetSocket).emit('call:accepted', {
        from: userId,
        user: socket.userData,
        connectedAt,
      });
    }
    io.to(socket.id).emit('call:connected', {
      from: to,
      connectedAt,
    });
  });

  socket.on('call:reject', ({ to }) => {
    activeCallUsers.delete(userId);
    activeCallUsers.delete(to);
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:rejected', { from: userId });
    }
  });

  socket.on('call:end', ({ to }) => {
    activeCallUsers.delete(userId);
    activeCallUsers.delete(to);
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:ended', { from: userId });
    }
  });

  socket.on('call:toggle-video', ({ to, videoEnabled }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:video-toggled', { from: userId, videoEnabled });
    }
  });

  socket.on('call:toggle-audio', ({ to, audioEnabled }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call:audio-toggled', { from: userId, audioEnabled });
    }
  });

  socket.on('meeting:create', ({ meetingId, name }) => {
    socket.join(`meeting:${meetingId}`);
    if (!meetingRooms.has(meetingId)) {
      meetingRooms.set(meetingId, new Map());
    }
    const room = meetingRooms.get(meetingId);
    room.set(userId, {
      socketId: socket.id,
      user: socket.userData,
      audioEnabled: true,
      videoEnabled: true,
      screenSharing: false,
    });

    io.to(`meeting:${meetingId}`).emit('meeting:participants', {
      participants: Array.from(room.values()).map(p => ({
        userId: p.user.id,
        user: p.user,
        audioEnabled: p.audioEnabled,
        videoEnabled: p.videoEnabled,
        screenSharing: p.screenSharing,
      })),
    });
  });

  socket.on('meeting:join', ({ meetingId }) => {
    socket.join(`meeting:${meetingId}`);
    if (!meetingRooms.has(meetingId)) {
      meetingRooms.set(meetingId, new Map());
    }
    const room = meetingRooms.get(meetingId);
    room.set(userId, {
      socketId: socket.id,
      user: socket.userData,
      audioEnabled: true,
      videoEnabled: true,
      screenSharing: false,
    });

    socket.to(`meeting:${meetingId}`).emit('meeting:user-joined', {
      userId,
      user: socket.userData,
    });

    io.to(`meeting:${meetingId}`).emit('meeting:participants', {
      participants: Array.from(room.values()).map(p => ({
        userId: p.user.id,
        user: p.user,
        audioEnabled: p.audioEnabled,
        videoEnabled: p.videoEnabled,
        screenSharing: p.screenSharing,
      })),
    });
  });

  socket.on('meeting:leave', ({ meetingId }) => {
    socket.leave(`meeting:${meetingId}`);
    const room = meetingRooms.get(meetingId);
    if (room) {
      room.delete(userId);
      socket.to(`meeting:${meetingId}`).emit('meeting:user-left', { userId });
      if (room.size === 0) {
        meetingRooms.delete(meetingId);
      }
    }
  });

  socket.on('meeting:screen-share', ({ meetingId, sharing }) => {
    const room = meetingRooms.get(meetingId);
    if (room && room.has(userId)) {
      const participant = room.get(userId);
      participant.screenSharing = sharing;
      socket.to(`meeting:${meetingId}`).emit('meeting:screen-share-state', {
        userId,
        sharing,
      });
    }
  });

  socket.on('meeting:offer', ({ meetingId, to, offer }) => {
    io.to(`meeting:${meetingId}`).emit('signal:offer', {
      from: userId,
      offer,
      user: socket.userData,
    });
  });

  socket.on('meeting:answer', ({ meetingId, to, answer }) => {
    io.to(`meeting:${meetingId}`).emit('signal:answer', {
      from: userId,
      answer,
    });
  });

  socket.on('presentation:start', ({ meetingId, slideData }) => {
    socket.to(`meeting:${meetingId}`).emit('presentation:started', {
      from: userId,
      slideData,
    });
  });

  socket.on('presentation:next', ({ meetingId, slideIndex }) => {
    socket.to(`meeting:${meetingId}`).emit('presentation:slide-changed', {
      from: userId,
      slideIndex,
    });
  });

  socket.on('presentation:prev', ({ meetingId, slideIndex }) => {
    socket.to(`meeting:${meetingId}`).emit('presentation:slide-changed', {
      from: userId,
      slideIndex,
    });
  });

  socket.on('presentation:end', ({ meetingId }) => {
    socket.to(`meeting:${meetingId}`).emit('presentation:ended', {
      from: userId,
    });
  });

  socket.on('call:add-participant', ({ callId, newUserId }) => {
    if (activeCallUsers.has(newUserId)) {
      io.to(socket.id).emit('call:participant-busy', { userId: newUserId });
      return;
    }
    const targetSocket = connectedUsers.get(newUserId);
    if (targetSocket) {
      io.to(targetSocket).emit('call:incoming', {
        from: userId,
        callType: 'voice',
        callLogId: callId,
        isConference: true,
        user: socket.userData,
      });
    }
    const callerSocket = connectedUsers.get(userId);
    if (callerSocket) {
      io.to(callerSocket).emit('call:participant-invited', { userId: newUserId });
    }
  });

  socket.on('chat:typing', ({ to, isTyping }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('chat:typing', {
        from: userId,
        isTyping,
      });
    }
  });

  socket.on('chat:message', ({ to, message }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('chat:message', {
        from: userId,
        message,
        user: socket.userData,
      });
    }
  });

  socket.on('chat:read', ({ to }) => {
    const targetSocket = connectedUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('chat:read', { from: userId });
    }
  });
};

module.exports = { webrtcHandlers, connectedUsers, meetingRooms, activeCallUsers };
