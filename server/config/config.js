const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
  jwtExpiry: '7d',
  bcryptSaltRounds: 10,
  turnServer: {
    urls: process.env.TURN_URL || 'turn:your-turn-server.com:3478',
    username: process.env.TURN_USERNAME || 'username',
    credential: process.env.TURN_CREDENTIAL || 'credential',
  },
};
