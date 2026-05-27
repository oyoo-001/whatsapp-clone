const { Message, User, Contact } = require('../models');
const { Op, Sequelize } = require('sequelize');

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
    const sentMessages = await Message.findAll({
      where: { senderId: req.user.id },
      attributes: [
        'receiverId',
        [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'lastMessageAt'],
      ],
      group: ['receiverId'],
      raw: true,
    });

    const receivedMessages = await Message.findAll({
      where: { receiverId: req.user.id },
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
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
    });

    const conversations = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Message.findOne({
          where: {
            [Op.or]: [
              { senderId: req.user.id, receiverId: user.id },
              { senderId: user.id, receiverId: req.user.id },
            ],
          },
          order: [['createdAt', 'DESC']],
          include: [
            { model: User, as: 'sender', attributes: ['id', 'username'] },
          ],
        });

        const unreadCount = await Message.count({
          where: {
            senderId: user.id,
            receiverId: req.user.id,
            isRead: false,
          },
        });

        return {
          user: user.toJSON(),
          lastMessage,
          unreadCount,
          lastMessageAt: conversationMap.get(user.id),
        };
      })
    );

    conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

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

    const message = await Message.findOne({
      where: { id: messageId, senderId: req.user.id },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }

    if (mode === 'me') {
      message.content = null;
      message.fileUrl = null;
      message.messageType = 'text';
      message.isDeleted = true;
      await message.save();
    } else {
      await message.destroy();
    }

    const io = req.app.get('io');
    if (io) {
      const connectedUsers = require('../socket/index').connectedUsers;
      const targetSocket = connectedUsers.get(message.receiverId);
      if (targetSocket) {
        io.to(targetSocket).emit('chat:deleted', { messageId: message.id, mode: mode || 'all' });
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
