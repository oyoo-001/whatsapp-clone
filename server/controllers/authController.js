const { User } = require('../models');
const { generateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

const trimInput = (str) => (str || '').toString().trim();

exports.register = async (req, res) => {
  try {
    const phoneNumber = trimInput(req.body.phoneNumber);
    const username = trimInput(req.body.username);
    const password = req.body.password;
    const email = req.body.email ? trimInput(req.body.email) : undefined;

    if (!phoneNumber || !username || !password) {
      return res.status(400).json({ error: 'Phone number, username and password are required' });
    }

    if (phoneNumber.length < 3 || phoneNumber.length > 20) {
      return res.status(400).json({ error: 'Phone number must be between 3 and 20 characters' });
    }

    if (username.length < 2 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 2 and 50 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingPhone = await User.findOne({ where: { phoneNumber } });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
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
    const phoneNumber = trimInput(req.body.phoneNumber);
    const password = req.body.password;

    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password are required' });
    }

    const user = await User.findOne({ where: { phoneNumber } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked due to too many failed attempts
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.lockoutUntil) - new Date()) / 60000);
      return res.status(429).json({
        error: `Account temporarily locked. Try again in ${remainingMinutes} minute(s)`,
        lockout: true,
        remainingMinutes,
      });
    }

    // Reset lockout if window has expired
    if (user.lockoutUntil && new Date(user.lockoutUntil) <= new Date()) {
      user.loginAttempts = 0;
      user.lockoutUntil = null;
      await user.save();
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        user.loginAttempts = 0;
        await user.save();
        return res.status(429).json({
          error: `Account temporarily locked due to too many failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes`,
          lockout: true,
          remainingMinutes: LOCKOUT_DURATION_MINUTES,
        });
      }
      await user.save();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        error: 'Your account has been deactivated. Please contact support for assistance.',
        isBanned: true,
      });
    }

    // Successful login - reset attempts
    user.loginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();

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

    if (username) {
      const trimmed = trimInput(username);
      if (trimmed.length < 2 || trimmed.length > 50) {
        return res.status(400).json({ error: 'Username must be between 2 and 50 characters' });
      }
      updateFields.username = trimmed;
    }
    if (email !== undefined) updateFields.email = email;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (status !== undefined) updateFields.status = trimInput(status);

    await req.user.update(updateFields);

    const io = req.app.get('io');
    if (io) {
      io.emit('user:updated', { userId: req.user.id, updates: updateFields });
    }

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

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
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
