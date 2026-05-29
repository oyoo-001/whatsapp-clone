const { SupportTicket, SupportMessage, User } = require('../models');

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
