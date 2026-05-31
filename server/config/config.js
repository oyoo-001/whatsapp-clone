const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TURN_URL = process.env.TURN_URL;
const TURN_USERNAME = process.env.TURN_USERNAME;
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL;
const hasTurn = TURN_URL && TURN_URL !== 'turn:your-turn-server.com:3478' && TURN_CREDENTIAL && TURN_CREDENTIAL !== 'credential';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret_key_change_in_production' || process.env.JWT_SECRET === 'fallback_secret') {
  console.error('FATAL: JWT_SECRET environment variable is not set or is using a default value. Set a strong secret in .env');
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: '7d',
  bcryptSaltRounds: 10,
  turnServer: hasTurn ? {
    urls: TURN_URL,
    username: TURN_USERNAME || '',
    credential: TURN_CREDENTIAL,
  } : null,
  stunServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  maxGroupParticipants: parseInt(process.env.MAX_GROUP_PARTICIPANTS, 10) || 6,
};
