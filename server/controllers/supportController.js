const { SupportTicket, SupportMessage, User } = require('../models');
const { generateSupportToken } = require('../middleware/auth');

exports.createTicket = async (req, res) => {
  try {
    const existing = await SupportTicket.findOne({
      where: { userId: req.user.id, status: ['open', 'in_progress'] },
    });
    if (existing) {
      return res.json({ ticket: existing });
    }
    const ticket = await SupportTicket.create({
      userId: req.user.id,
    });
    res.status(201).json({ ticket });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

exports.getMyTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'admin', attributes: ['id', 'username', 'avatar', 'isAdmin'] }],
    });
    res.json({ ticket });
  } catch (error) {
    console.error('Get support ticket error:', error);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      where: { userId: req.user.id, status: ['open', 'in_progress', 'resolved'] },
      order: [['createdAt', 'DESC']],
    });
    if (!ticket) return res.json({ messages: [] });

    const messages = await SupportMessage.findAll({
      where: { ticketId: ticket.id },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar', 'isAdmin'] }],
      order: [['createdAt', 'ASC']],
    });
    res.json({ messages, ticket });
  } catch (error) {
    console.error('Get support messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    let ticket = await SupportTicket.findOne({
      where: { userId: req.user.id, status: ['open', 'in_progress'] },
    });
    if (!ticket) {
      ticket = await SupportTicket.create({ userId: req.user.id });
    }

    const message = await SupportMessage.create({
      ticketId: ticket.id,
      senderId: req.user.id,
      content: content.trim(),
    });

    const fullMessage = await SupportMessage.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar', 'isAdmin'] }],
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.user.id}`).emit('support:new-message', { message: fullMessage, ticketId: ticket.id });
      io.to(`ticket-${ticket.id}`).emit('support:new-message', { message: fullMessage, ticketId: ticket.id });
      if (ticket.adminId) {
        io.to(`user-${ticket.adminId}`).emit('support:new-message', { message: fullMessage, ticketId: ticket.id, userId: req.user.id });
      }
      io.emit('admin:support-update', { ticketId: ticket.id, userId: req.user.id, status: ticket.status });
    }

    res.status(201).json({ message: fullMessage, ticket });
  } catch (error) {
    console.error('Send support message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.createBannedTicket = async (req, res) => {
  try {
    const { phoneNumber, message: content } = req.body;
    if (!phoneNumber || !content || !content.trim()) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const user = await User.findOne({ where: { phoneNumber } });
    if (!user) {
      return res.status(404).json({ error: 'Account not found with this phone number' });
    }

    const existingOpen = await SupportTicket.findOne({
      where: { userId: user.id, status: ['open', 'in_progress'] },
    });
    if (existingOpen) {
      const existingToken = generateSupportToken(existingOpen.id, user.id);
      return res.json({
        ticket: existingOpen,
        ticketId: existingOpen.id,
        ticketIdDisplay: `TKT-${String(existingOpen.id).padStart(5, '0')}`,
        supportToken: existingToken,
        existing: true,
      });
    }

    const ticket = await SupportTicket.create({
      userId: user.id,
      contactPhone: phoneNumber,
      isBannedRequest: true,
      subject: 'Account deactivated - requesting help',
    });

    const ticketId = ticket.id;
    const ticketIdDisplay = `TKT-${String(ticketId).padStart(5, '0')}`;

    await SupportMessage.create({
      ticketId,
      senderId: user.id,
      content: `[Auto-submitted from banned user]\nPhone: ${phoneNumber}\nMessage: ${content.trim()}`,
    });

    const supportToken = generateSupportToken(ticketId, user.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('admin:support-update', { ticketId, userId: user.id, status: 'open', isBannedRequest: true });
    }

    res.status(201).json({
      ticket,
      ticketId,
      ticketIdDisplay,
      supportToken,
      message: 'Support request submitted successfully',
    });
  } catch (error) {
    console.error('Create banned ticket error:', error);
    res.status(500).json({ error: 'Failed to submit support request' });
  }
};

exports.getBannedMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;
    if (parseInt(ticketId) !== req.supportToken.ticketId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const ticket = await SupportTicket.findByPk(ticketId, {
      include: [{ model: User, as: 'admin', attributes: ['id', 'username', 'avatar'] }],
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const messages = await SupportMessage.findAll({
      where: { ticketId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar', 'isAdmin'] }],
      order: [['createdAt', 'ASC']],
    });

    res.json({ messages, ticket });
  } catch (error) {
    console.error('Get banned messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

exports.sendBannedMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content } = req.body;

    if (parseInt(ticketId) !== req.supportToken.ticketId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const ticket = await SupportTicket.findByPk(ticketId);
    if (!ticket || ticket.status === 'resolved') {
      return res.status(400).json({ error: 'Ticket is closed' });
    }

    const message = await SupportMessage.create({
      ticketId: parseInt(ticketId),
      senderId: req.user.id,
      content: content.trim(),
    });

    const fullMessage = await SupportMessage.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar', 'isAdmin'] }],
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`ticket-${ticketId}`).emit('support:new-message', { message: fullMessage, ticketId: parseInt(ticketId) });
      if (ticket.adminId) {
        io.to(`user-${ticket.adminId}`).emit('support:new-message', { message: fullMessage, ticketId: parseInt(ticketId), userId: req.user.id });
      }
      io.emit('admin:support-update', { ticketId: parseInt(ticketId), userId: req.user.id, status: ticket.status });
    }

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('Send banned message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
