const { User } = require('../models');
const { generateToken } = require('../middleware/auth');

exports.register = async (req, res) => {
  try {
    const { phoneNumber, username, password, email } = req.body;

    if (!phoneNumber || !username || !password) {
      return res.status(400).json({ error: 'Phone number, username and password are required' });
    }

    const existingUser = await User.findOne({ where: { phoneNumber } });
    if (existingUser) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const user = await User.create({ phoneNumber, username, password, email });
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password are required' });
    }

    const user = await User.findOne({ where: { phoneNumber } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({ user: req.user, token: req.token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, email, avatar, status } = req.body;
    const updateFields = {};

    if (username) updateFields.username = username;
    if (email !== undefined) updateFields.email = email;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (status !== undefined) updateFields.status = status;

    await req.user.update(updateFields);
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Profile update failed' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Password change failed' });
  }
};
