const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isBanned) {
      return res.status(403).json({
        error: 'Your account has been deactivated. Please contact support for assistance.',
        isBanned: true,
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, phoneNumber: user.phoneNumber },
    config.jwtSecret,
    { expiresIn: config.jwtExpiry }
  );
};

const adminAuth = async (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const generateSupportToken = (ticketId, userId) => {
  return jwt.sign(
    { ticketId, userId, scope: 'banned-support' },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
};

const supportTokenAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No support token provided' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const decoded = jwt.verify(token, config.jwtSecret);

    if (decoded.scope !== 'banned-support') {
      return res.status(403).json({ error: 'Invalid support token' });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    req.supportToken = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Support session expired. Please submit a new request.' });
    }
    res.status(401).json({ error: 'Invalid support token' });
  }
};

module.exports = { auth, adminAuth, generateToken, generateSupportToken, supportTokenAuth };
