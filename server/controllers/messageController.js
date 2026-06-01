const { Message, User, Contact, Broadcast, BroadcastRead } = require('../models');
const { Op, Sequelize } = require('sequelize');
const { sendMessagePush } = require('../services/pushService');

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType, fileUrl, fileSize, mimeType, replyToId } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: 'Receiver ID is required' });
    }

    if (!content && !fileUrl) {
      return res.status(400).json({ error: 'Message content or file is required' });
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const blockedByMe = await Contact.findOne({ where: { userId: req.user.id, contactUserId: receiverId, isBlocked: true } });
    const blockedMe = await Contact.findOne({ where: { userId: receiverId, contactUserId: req.user.id, isBlocked: true } });
    if (blockedByMe || blockedMe) {
      return res.status(403).json({ error: 'Cannot send message — user is blocked' });
    }

    let replyToContent = null;
    if (replyToId) {
      const replyMsg = await Message.findByPk(replyToId);
      if (replyMsg) {
        replyToContent = (replyMsg.messageType === 'text' ? replyMsg.content : `[${replyMsg.messageType}]`).substring(0, 200);
      }
    }

    const message = await Message.create({
      senderId: req.user.id,
      receiverId,
      content: content || null,
      messageType: messageType || 'text',
      fileUrl: fileUrl || null,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
      replyToId: replyToId || null,
      replyToContent,
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] },
      ],
    });

    const io = req.app.get('io');
    if (io) {
      const connectedUsers = require('../socket/index').connectedUsers;
      const targetSocket = connectedUsers.get(receiverId);
      if (targetSocket) {
        await Message.update({ isDelivered: true }, { where: { id: message.id } });
        fullMessage.isDelivered = true;
        io.to(targetSocket).emit('chat:message', {
          from: req.user.id,
          message: fullMessage,
          user: { id: req.user.id, username: req.user.username, avatar: req.user.avatar },
        });
        const senderSocket = connectedUsers.get(req.user.id);
        if (senderSocket) {
          io.to(senderSocket).emit('chat:delivered', { messageId: message.id });
        }
      } else {
        sendMessagePush(req.user, receiverId, content, messageType);
      }
    }

    if (io) {
      io.emit('conversation:update', { userId: req.user.id });
      io.emit('conversation:update', { userId: receiverId });
    }
    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, before } = req.query;

    if (String(userId) === '0') {
      const broadcastWhere = { isDeleted: false };
      if (before) {
        broadcastWhere.createdAt = { [Op.lt]: new Date(before) };
      }

      const broadcasts = await Broadcast.findAll({
        where: broadcastWhere,
        include: [
          { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      const messages = broadcasts.map(b => ({
        id: `bc-${b.id}`,
        senderId: 0,
        receiverId: req.user.id,
        content: b.content,
        messageType: b.messageType,
        fileUrl: b.fileUrl,
        fileSize: b.fileSize,
        mimeType: b.mimeType,
        isBroadcast: true,
        isDeleted: b.isDeleted,
        isRead: true,
        isDelivered: true,
        isEdited: false,
        isForwarded: false,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        sender: { id: 0, username: 'TuChat', avatar: null, status: 'TuChat Team, we value you' },
        receiver: { id: req.user.id, username: req.user.username, avatar: req.user.avatar },
      }));

      const total = await Broadcast.count({ where: broadcastWhere });
      res.json({ messages: messages.reverse(), total, hasMore: offset + messages.length < total });
      return;
    }

    const whereClause = {
      [Op.or]: [
        { senderId: req.user.id, receiverId: userId },
        { senderId: userId, receiverId: req.user.id },
      ],
    };

    if (before) {
      whereClause.createdAt = { [Op.lt]: new Date(before) };
    }

    const messages = await Message.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const total = await Message.count({ where: whereClause });

    res.json({ messages: messages.reverse(), total, hasMore: offset + messages.length < total });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const sentMessages = await Message.findAll({
      where: { senderId: userId },
      attributes: [
        'receiverId',
        [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'lastMessageAt'],
      ],
      group: ['receiverId'],
      raw: true,
    });

    const receivedMessages = await Message.findAll({
      where: { receiverId: userId },
      attributes: [
        'senderId',
        [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'lastMessageAt'],
      ],
      group: ['senderId'],
      raw: true,
    });

    const conversationMap = new Map();

    for (const msg of sentMessages) {
      const key = msg.receiverId;
      const existing = conversationMap.get(key);
      if (!existing || new Date(msg.lastMessageAt) > new Date(existing)) {
        conversationMap.set(key, msg.lastMessageAt);
      }
    }

    for (const msg of receivedMessages) {
      const key = msg.senderId;
      const existing = conversationMap.get(key);
      if (!existing || new Date(msg.lastMessageAt) > new Date(existing)) {
        conversationMap.set(key, msg.lastMessageAt);
      }
    }

    const userIds = Array.from(conversationMap.keys());
    const hasSystem = userIds.includes(0);
    const realUserIds = userIds.filter(id => id !== 0);

    let users = [];
    if (realUserIds.length > 0) {
      users = await User.findAll({
        where: { id: { [Op.in]: realUserIds } },
        attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen', 'isVerified'],
      });
    }

    const latestBroadcast = await Broadcast.findOne({
      where: { isDeleted: false },
      order: [['createdAt', 'DESC']],
    });

    if (latestBroadcast || hasSystem) {
      users.push({
        id: 0,
        username: 'TuChat',
        phoneNumber: null,
        avatar: null,
        status: 'TuChat Team, we value you',
        isOnline: false,
        lastSeen: null,
        toJSON: function () {
          return { id: 0, username: 'TuChat', phoneNumber: null, avatar: null, status: 'TuChat Team, we value you', isOnline: false, lastSeen: null };
        },
      });
    }

    const readBroadcastIds = await BroadcastRead.findAll({
      where: { userId },
      attributes: ['broadcastId'],
      raw: true,
    });
    const readBroadcastIdSet = new Set(readBroadcastIds.map(r => r.broadcastId));
    const totalBroadcasts = await Broadcast.count({ where: { isDeleted: false } });

    // Batch unread counts — 1 grouped query instead of N individual queries
    const unreadRows = await Message.findAll({
      where: { receiverId: userId, isRead: false },
      attributes: ['senderId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['senderId'],
      raw: true,
    });
    const unreadCountMap = new Map(unreadRows.map(r => [r.senderId, parseInt(r.count)]));

    // Batch latest messages — fetch last 300 messages and deduplicate by partner
    const recentMessages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId },
          { receiverId: userId },
        ],
        isDeleted: false,
        isBroadcast: false,
      },
      order: [['createdAt', 'DESC']],
      limit: 300,
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username'] },
      ],
    });

    const latestMessageMap = new Map();
    for (const msg of recentMessages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!latestMessageMap.has(partnerId)) {
        latestMessageMap.set(partnerId, msg);
      }
    }

    // Fallback for partners whose latest message is older than 300
    for (const uid of realUserIds) {
      if (!latestMessageMap.has(uid)) {
        const msg = await Message.findOne({
          where: {
            [Op.or]: [
              { senderId: userId, receiverId: uid },
              { senderId: uid, receiverId: userId },
            ],
            isDeleted: false,
            isBroadcast: false,
          },
          order: [['createdAt', 'DESC']],
          include: [
            { model: User, as: 'sender', attributes: ['id', 'username'] },
          ],
        });
        if (msg) latestMessageMap.set(uid, msg);
      }
    }

    const conversations = users.map((user) => {
      let lastMessage = null;
      let unreadCount = 0;
      let lastMessageAt = conversationMap.get(user.id);

      if (user.id === 0) {
        const bc = latestBroadcast;
        if (bc) {
          lastMessage = {
            id: bc.id,
            senderId: 0,
            receiverId: userId,
            content: bc.content,
            messageType: bc.messageType,
            fileUrl: bc.fileUrl,
            fileSize: bc.fileSize,
            mimeType: bc.mimeType,
            isBroadcast: true,
            isDeleted: false,
            createdAt: bc.createdAt,
            sender: bc.sender || { id: 0, username: 'TuChat', status: 'TuChat Team, we value you' },
          };
        }
        unreadCount = totalBroadcasts - readBroadcastIdSet.size;
        if (unreadCount < 0) unreadCount = 0;
        if (!lastMessageAt && bc) {
          lastMessageAt = bc.createdAt;
        }
      } else {
        lastMessage = latestMessageMap.get(user.id) || null;
        unreadCount = unreadCountMap.get(user.id) || 0;
      }

      return {
        user: user.toJSON(),
        lastMessage,
        unreadCount,
        lastMessageAt,
      };
    });

    conversations.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    if (String(userId) === '0') {
      const unreadBroadcasts = await Broadcast.findAll({
        where: { isDeleted: false },
      });
      for (const bc of unreadBroadcasts) {
        const existing = await BroadcastRead.findOne({
          where: { broadcastId: bc.id, userId: req.user.id },
        });
        if (!existing) {
          await BroadcastRead.create({ broadcastId: bc.id, userId: req.user.id, readAt: new Date() });
        }
      }
      res.json({ message: 'Broadcasts marked as read' });
      return;
    }

    const updated = await Message.update(
      { isRead: true, isDelivered: true },
      {
        where: {
          senderId: userId,
          receiverId: req.user.id,
          isRead: false,
        },
      }
    );

    if (updated[0] > 0) {
      const io = req.app.get('io');
      if (io) {
        const connectedUsers = require('../socket/index').connectedUsers;
        const senderSocket = connectedUsers.get(userId);
        if (senderSocket) {
          io.to(senderSocket).emit('chat:delivered', { messageId: null, bulk: true });
          io.to(senderSocket).emit('chat:read', {
            byUserId: req.user.id,
            messageIds: [],
          });
        }
        io.emit('conversation:update', { userId: req.user.id });
        io.emit('conversation:update', { userId });
      }
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    const message = await Message.findOne({
      where: { id: messageId, senderId: req.user.id },
    });

    if (!message) return res.status(404).json({ error: 'Message not found or not yours' });

    message.content = content;
    message.isEdited = true;
    await message.save();

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] },
      ],
    });

    const io = req.app.get('io');
    if (io) {
      const connectedUsers = require('../socket/index').connectedUsers;
      const targetSocket = connectedUsers.get(message.receiverId);
      if (targetSocket) {
        io.to(targetSocket).emit('chat:edited', { messageId: message.id, content });
      }
    }

    res.json({ message: fullMessage });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

exports.forwardMessage = async (req, res) => {
  try {
    const { messageId, receiverId } = req.body;

    if (!messageId || !receiverId) {
      return res.status(400).json({ error: 'messageId and receiverId are required' });
    }

    const original = await Message.findByPk(messageId);
    if (!original) return res.status(404).json({ error: 'Original message not found' });

    const newMessage = await Message.create({
      senderId: req.user.id,
      receiverId,
      content: original.content,
      messageType: original.messageType,
      fileUrl: original.fileUrl,
      fileSize: original.fileSize,
      mimeType: original.mimeType,
      isForwarded: true,
    });

    const fullMessage = await Message.findByPk(newMessage.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] },
      ],
    });

    const io = req.app.get('io');
    if (io) {
      const connectedUsers = require('../socket/index').connectedUsers;
      const targetSocket = connectedUsers.get(receiverId);
      if (targetSocket) {
        io.to(targetSocket).emit('chat:message', {
          from: req.user.id,
          message: fullMessage,
          user: { id: req.user.id, username: req.user.username, avatar: req.user.avatar },
        });
      }
    }

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('Forward message error:', error);
    res.status(500).json({ error: 'Failed to forward message' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { mode } = req.query;

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId === 0) {
      if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Only admins can delete broadcast messages' });
      }
    } else if (message.senderId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (mode === 'me') {
      return res.json({ message: 'Message deleted locally' });
    }

    await message.destroy();

    const io = req.app.get('io');
    if (io) {
      const connectedUsers = require('../socket/index').connectedUsers;
      const targetSocket = connectedUsers.get(message.receiverId);
      if (targetSocket) {
        io.to(targetSocket).emit('chat:deleted', { messageId: message.id, mode: 'all' });
      }
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;

    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reactions = message.reactions || {};
    if (reactions[req.user.id] === reaction) {
      delete reactions[req.user.id];
    } else {
      reactions[req.user.id] = reaction;
    }

    message.reactions = reactions;
    await message.save();

    res.json({ message: 'Reaction updated', reactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add reaction' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    await Message.destroy({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: userId },
          { senderId: userId, receiverId: req.user.id },
        ],
      },
    });
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};
