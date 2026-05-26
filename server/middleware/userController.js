const { User, Contact } = require('../models');
const { Op } = require('sequelize');

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { username: { [Op.like]: `%${query}%` } },
          { phoneNumber: { [Op.like]: `%${query}%` } },
        ],
        id: { [Op.ne]: req.user.id },
      },
      attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
      limit: 20,
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const contact = await Contact.findOne({
      where: { userId: req.user.id, contactUserId: userId },
    });

    res.json({ user, isContact: !!contact });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

exports.addContact = async (req, res) => {
  try {
    const { contactUserId, customName } = req.body;

    if (contactUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot add yourself as contact' });
    }

    const contactUser = await User.findByPk(contactUserId);
    if (!contactUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [contact, created] = await Contact.findOrCreate({
      where: { userId: req.user.id, contactUserId },
      defaults: { customName },
    });

    if (!created) {
      return res.status(400).json({ error: 'Contact already exists' });
    }

    res.status(201).json({ contact, message: 'Contact added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add contact' });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      where: { userId: req.user.id, isBlocked: false },
      include: [{
        model: User,
        as: 'contactUser',
        attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
      }],
      order: [['createdAt', 'DESC']],
    });

    res.json({ contacts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get contacts' });
  }
};

exports.removeContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const deleted = await Contact.destroy({
      where: { id: contactId, userId: req.user.id },
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove contact' });
  }
};

exports.searchByPhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const user = await User.findOne({
      where: { phoneNumber, id: { [Op.ne]: req.user.id } },
      attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
    });

    const contact = user ? await Contact.findOne({ where: { userId: req.user.id, contactUserId: user.id } }) : null;

    res.json({ user, isContact: !!contact });
  } catch (error) {
    console.error('Search by phone error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.blockContact = async (req, res) => {
  try {
    const { contactUserId } = req.params;
    const contact = await Contact.findOne({
      where: { userId: req.user.id, contactUserId },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    contact.isBlocked = !contact.isBlocked;
    await contact.save();

    res.json({ message: `Contact ${contact.isBlocked ? 'blocked' : 'unblocked'}`, contact });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle block' });
  }
};
