const { User, Message, Group, GroupMessage, SupportTicket, SupportMessage, Broadcast, BroadcastRead, Channel, ChannelFollower } = require("../models");
const { Op, Sequelize } = require("sequelize");

exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.count({ where: { isBanned: false } });
    const usersToday = await User.count({
      where: {
        createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });
    // Count distinct conversations (pairs of senderId-receiverId)
    const conversationPairs = await Message.findAll({
      where: { isBroadcast: { [Op.not]: true } },
      attributes: ["senderId", "receiverId"],
      group: ["senderId", "receiverId"],
      raw: true,
    });
    const totalConversations = conversationPairs.length;
    const totalGroups = await Group.count();
    const totalMessages = await Message.count();
    const totalGroupMessages = await GroupMessage.count();
    const bannedUsers = await User.count({ where: { isBanned: true } });

    res.json({
      totalUsers,
      usersToday,
      totalConversations,
      totalGroups,
      totalMessages,
      totalGroupMessages,
      bannedUsers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.isVerified = !user.isVerified;
    await user.save();
    res.json({ userId: user.id, isVerified: user.isVerified });
  } catch (error) {
    console.error("Verify user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "username",
        "phoneNumber",
        "avatar",
        "status",
        "isOnline",
        "isAdmin",
        "isBanned",
        "isVerified",
        "createdAt",
        "lastSeen",
      ],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });
    res.json({ users });
  } catch (error) {
    console.error("Admin list users error:", error);
    res.status(500).json({ error: "Failed to list users" });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (String(userId) === String(req.user.id)) {
      return res.status(400).json({ error: "Cannot ban yourself" });
    }
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.isBanned = !user.isBanned;
    await user.save();
    res.json({ userId: user.id, isBanned: user.isBanned });
  } catch (error) {
    console.error("Ban user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

exports.makeAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.isAdmin = true;
    await user.save();
    res.json({ userId: user.id, isAdmin: true });
  } catch (error) {
    console.error("Make admin error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

exports.broadcastMessage = async (req, res) => {
  try {
    const { content, messageType, fileUrl, fileSize, mimeType } = req.body;
    const trimmedContent = content ? content.trim() : "";
    if (!trimmedContent && !fileUrl) {
      return res.status(400).json({ error: "Content or file is required" });
    }

    const broadcast = await Broadcast.create({
      senderId: req.user.id,
      content: trimmedContent || null,
      messageType: messageType || "text",
      fileUrl: fileUrl || null,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
    });

    const fullBroadcast = await Broadcast.findByPk(broadcast.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
      ],
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('broadcast:new', { broadcast: fullBroadcast });
    }

    res.status(201).json({ broadcast: fullBroadcast });
  } catch (error) {
    console.error("Broadcast error:", error);
    res.status(500).json({ error: "Failed to send broadcast" });
  }
};

exports.getBroadcasts = async (req, res) => {
  try {
    const broadcasts = await Broadcast.findAll({
      where: { isDeleted: false },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json({ broadcasts });
  } catch (error) {
    console.error("Get broadcasts error:", error);
    res.status(500).json({ error: "Failed to fetch broadcasts" });
  }
};

exports.deleteBroadcast = async (req, res) => {
  try {
    const { id } = req.params;
    const broadcast = await Broadcast.findByPk(id);
    if (!broadcast) {
      return res.status(404).json({ error: "Broadcast not found" });
    }
    broadcast.isDeleted = true;
    await broadcast.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('broadcast:deleted', { broadcastId: broadcast.id });
    }

    res.json({ message: "Broadcast deleted" });
  } catch (error) {
    console.error("Delete broadcast error:", error);
    res.status(500).json({ error: "Failed to delete broadcast" });
  }
};

exports.getUnreadBroadcasts = async (req, res) => {
  try {
    const readIds = await BroadcastRead.findAll({
      where: { userId: req.user.id },
      attributes: ['broadcastId'],
      raw: true,
    });
    const readIdSet = new Set(readIds.map(r => r.broadcastId));

    const broadcasts = await Broadcast.findAll({
      where: { isDeleted: false },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    const broadcastsWithReadStatus = broadcasts.map(b => ({
      ...b.toJSON(),
      isRead: readIdSet.has(b.id),
    }));

    res.json({ broadcasts: broadcastsWithReadStatus });
  } catch (error) {
    console.error("Get unread broadcasts error:", error);
    res.status(500).json({ error: "Failed to fetch broadcasts" });
  }
};

exports.markBroadcastRead = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await BroadcastRead.findOne({
      where: { broadcastId: id, userId: req.user.id },
    });
    if (!existing) {
      await BroadcastRead.create({ broadcastId: id, userId: req.user.id });
    }
    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error("Mark broadcast read error:", error);
    res.status(500).json({ error: "Failed to mark as read" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: userId },
          { senderId: userId, receiverId: req.user.id },
        ],
      },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "username", "avatar", "isAdmin"],
        },
      ],
      order: [["createdAt", "ASC"]],
      limit: 100,
    });
    res.json({ messages });
  } catch (error) {
    console.error("Get admin messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { userId, content } = req.body;
    if (!userId || !content || !content.trim()) {
      return res.status(400).json({ error: "userId and content required" });
    }
    const message = await Message.create({
      senderId: req.user.id,
      receiverId: userId,
      content: content.trim(),
    });
    const fullMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "username", "avatar", "isAdmin"],
        },
      ],
    });
    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error("Send admin message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

exports.getSupportQueue = async (req, res) => {
  try {
    const tickets = await SupportTicket.findAll({
      where: { status: ['open', 'in_progress'] },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'avatar', 'phoneNumber'] },
        { model: User, as: 'admin', attributes: ['id', 'username', 'avatar'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ tickets });
  } catch (error) {
    console.error('Get support queue error:', error);
    res.status(500).json({ error: 'Failed to get queue' });
  }
};

exports.getSupportHistory = async (req, res) => {
  try {
    const tickets = await SupportTicket.findAll({
      where: { status: 'resolved' },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'avatar', 'phoneNumber'] },
        { model: User, as: 'admin', attributes: ['id', 'username', 'avatar'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json({ tickets });
  } catch (error) {
    console.error('Get support history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
};

exports.claimTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.status === 'resolved') return res.status(400).json({ error: 'Ticket already resolved' });
    ticket.adminId = req.user.id;
    ticket.status = 'in_progress';
    await ticket.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${ticket.userId}`).emit('admin:support-update', { ticketId: ticket.id, status: 'in_progress', adminId: req.user.id });
      io.to(`ticket-${ticket.id}`).emit('support:ticket-status', { ticketId: ticket.id, status: 'in_progress', adminId: req.user.id });
      io.emit('admin:support-queue-update', { ticketId: ticket.id, status: 'in_progress', adminId: req.user.id });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Claim ticket error:', error);
    res.status(500).json({ error: 'Failed to claim ticket' });
  }
};

exports.resolveTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = 'resolved';
    await ticket.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${ticket.userId}`).emit('admin:support-update', { ticketId: ticket.id, status: 'resolved' });
      io.to(`ticket-${ticket.id}`).emit('support:ticket-status', { ticketId: ticket.id, status: 'resolved' });
      io.emit('admin:support-queue-update', { ticketId: ticket.id, status: 'resolved' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Resolve ticket error:', error);
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
};

exports.getSupportTicketMessages = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const messages = await SupportMessage.findAll({
      where: { ticketId: ticket.id },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar', 'isAdmin'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json({ messages, ticket });
  } catch (error) {
    console.error('Get ticket messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

exports.sendSupportMessage = async (req, res) => {
  try {
    const { ticketId, content } = req.body;
    if (!ticketId || !content || !content.trim()) {
      return res.status(400).json({ error: 'ticketId and content required' });
    }

    const ticket = await SupportTicket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.status === 'resolved') return res.status(400).json({ error: 'Ticket already resolved' });

    if (!ticket.adminId) {
      ticket.adminId = req.user.id;
      ticket.status = 'in_progress';
      await ticket.save();
    }

    const message = await SupportMessage.create({
      ticketId,
      senderId: req.user.id,
      content: content.trim(),
    });

    const fullMessage = await SupportMessage.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar', 'isAdmin'] }],
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${ticket.userId}`).emit('support:new-message', { message: fullMessage, ticketId });
      io.to(`ticket-${ticket.id}`).emit('support:new-message', { message: fullMessage, ticketId });
      io.to(`user-${req.user.id}`).emit('support:new-message', { message: fullMessage, ticketId });
    }

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('Send support message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.listChannels = async (req, res) => {
  try {
    const channels = await Channel.findAll({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username'] },
        { model: ChannelFollower, as: 'followers', attributes: ['userId'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({
      channels: channels.map(ch => ({
        ...ch.toJSON(),
        followerCount: ch.followers?.length || 0,
      })),
    });
  } catch (error) {
    console.error('List channels error:', error);
    res.status(500).json({ error: 'Failed to list channels' });
  }
};

exports.verifyChannel = async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    channel.isVerified = !channel.isVerified;
    await channel.save();
    res.json({ channel: { id: channel.id, isVerified: channel.isVerified } });
  } catch (error) {
    console.error('Verify channel error:', error);
    res.status(500).json({ error: 'Failed to verify channel' });
  }
};
