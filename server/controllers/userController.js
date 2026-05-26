const { User, Contact } = require('../models');
const { Op } = require('sequelize');

exports.searchUsers = async (req, res) => {
  try {
    const q = req.query.query || req.query.q;
    if (!q || q.length < 1) return res.status(400).json({ error: 'Search query required' });

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { username: { [Op.like]: `%${q}%` } },
          { phoneNumber: { [Op.like]: `%${q}%` } },
        ],
        id: { [Op.ne]: req.user.id },
      },
      attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
      limit: 20,
    });

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.searchByPhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number required' });

    const user = await User.findOne({
      where: { phoneNumber, id: { [Op.ne]: req.user.id } },
      attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
    });

    res.json({ user });
  } catch (error) {
    console.error('Search by phone error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      where: { userId: req.user.id },
      include: [{
        model: User,
        as: 'contactUser',
        attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
      }],
    });

    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
};

exports.addContact = async (req, res) => {
  try {
    const { contactUserId } = req.body;
    if (!contactUserId) return res.status(400).json({ error: 'contactUserId required' });

    const [contact, created] = await Contact.findOrCreate({
      where: { userId: req.user.id, contactUserId },
      defaults: { userId: req.user.id, contactUserId },
    });

    if (!created) return res.status(400).json({ error: 'Contact already exists' });

    const contactUser = await User.findByPk(contactUserId, {
      attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status'],
    });

    res.status(201).json({ contact: { ...contact.toJSON(), contactUser } });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: 'Failed to add contact' });
  }
};

exports.removeContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const deleted = await Contact.destroy({
      where: { id: contactId, userId: req.user.id },
    });

    if (!deleted) return res.status(404).json({ error: 'Contact not found' });
    res.json({ message: 'Contact removed' });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({ error: 'Failed to remove contact' });
  }
};

exports.blockContact = async (req, res) => {
  try {
    const { contactUserId } = req.params;
    const contact = await Contact.findOne({
      where: { userId: req.user.id, contactUserId },
    });

    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    contact.isBlocked = !contact.isBlocked;
    await contact.save();

    res.json({ isBlocked: contact.isBlocked });
  } catch (error) {
    console.error('Block contact error:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const contact = await Contact.findOne({
      where: { userId: req.user.id, contactUserId: userId },
    });

    res.json({
      user,
      isContact: !!contact,
      isBlocked: contact?.isBlocked || false,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};