const { Status, StatusView, User, Contact } = require('../models');
const { Op } = require('sequelize');

exports.createStatus = async (req, res) => {
  try {
    const { content, mediaUrl, mediaType, backgroundColor } = req.body;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const status = await Status.create({
      userId: req.user.id,
      content: content || null,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || 'text',
      backgroundColor: backgroundColor || null,
      expiresAt,
    });

    const fullStatus = await Status.findByPk(status.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'avatar'] }],
    });

    const io = req.app.get('io');
    if (io) {
      const contacts = await Contact.findAll({
        where: { userId: req.user.id },
        attributes: ['contactUserId'],
      });
      contacts.forEach(c => {
        io.to(`user-${c.contactUserId}`).emit('status:new', { status: fullStatus });
      });
    }

    res.status(201).json({ status: fullStatus });
  } catch (error) {
    console.error('Create status error:', error);
    res.status(500).json({ error: 'Failed to create status' });
  }
};

exports.getStatusFeed = async (req, res) => {
  try {
    const contactIds = await Contact.findAll({
      where: { userId: req.user.id },
      attributes: ['contactUserId'],
    });

    const userIds = [req.user.id, ...contactIds.map(c => c.contactUserId)];

    const statuses = await Status.findAll({
      where: {
        userId: userIds,
        expiresAt: { [Op.gt]: new Date() },
      },
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'avatar'] }],
      order: [['createdAt', 'DESC']],
    });

    const statusIds = statuses.map(s => s.id);
    const views = await StatusView.findAll({
      where: { statusId: statusIds, viewerId: req.user.id },
      attributes: ['statusId'],
    });
    const viewedSet = new Set(views.map(v => v.statusId));

    const grouped = {};
    statuses.forEach(s => {
      const uid = s.userId;
      if (!grouped[uid]) {
        grouped[uid] = {
          user: s.user,
          statuses: [],
        };
      }
      const plain = s.toJSON();
      plain.viewed = s.userId === req.user.id || viewedSet.has(s.id);
      grouped[uid].statuses.push(plain);
    });

    res.json({ statusGroups: Object.values(grouped) });
  } catch (error) {
    console.error('Get status feed error:', error);
    res.status(500).json({ error: 'Failed to get status feed' });
  }
};

exports.getMyStatuses = async (req, res) => {
  try {
    const statuses = await Status.findAll({
      where: {
        userId: req.user.id,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    });

    res.json({ statuses });
  } catch (error) {
    console.error('Get my statuses error:', error);
    res.status(500).json({ error: 'Failed to get statuses' });
  }
};

exports.deleteStatus = async (req, res) => {
  try {
    const statusId = req.params.id;
    const status = await Status.findOne({ where: { id: statusId, userId: req.user.id } });
    if (!status) return res.status(404).json({ error: 'Status not found' });

    const io = req.app.get('io');
    if (io) {
      const contacts = await Contact.findAll({
        where: { userId: req.user.id },
        attributes: ['contactUserId'],
      });
      contacts.forEach(c => {
        io.to(`user-${c.contactUserId}`).emit('status:deleted', { statusId, userId: req.user.id });
      });
    }

    await status.destroy();
    res.json({ message: 'Status deleted' });
  } catch (error) {
    console.error('Delete status error:', error);
    res.status(500).json({ error: 'Failed to delete status' });
  }
};

exports.viewStatus = async (req, res) => {
  try {
    const statusId = req.params.id;
    const status = await Status.findByPk(statusId);
    if (!status) return res.status(404).json({ error: 'Status not found' });

    if (String(status.userId) === String(req.user.id)) {
      return res.status(400).json({ error: 'Cannot view your own status' });
    }

    await StatusView.findOrCreate({
      where: { statusId, viewerId: req.user.id },
      defaults: { statusId, viewerId: req.user.id },
    });

    const viewer = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'avatar'],
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${status.userId}`).emit('status:viewed', { statusId, viewer });
    }

    res.json({ message: 'Status viewed' });
  } catch (error) {
    console.error('View status error:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
};

exports.getStatusViewers = async (req, res) => {
  try {
    const statusId = req.params.id;
    const status = await Status.findByPk(statusId);
    if (!status) return res.status(404).json({ error: 'Status not found' });

    if (String(status.userId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the owner can see viewers' });
    }

    const views = await StatusView.findAll({
      where: { statusId },
      include: [{ model: User, as: 'viewer', attributes: ['id', 'username', 'avatar'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json({ viewers: views.map(v => v.viewer) });
  } catch (error) {
    console.error('Get status viewers error:', error);
    res.status(500).json({ error: 'Failed to get viewers' });
  }
};
