const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
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

module.exports = { auth, generateToken };
