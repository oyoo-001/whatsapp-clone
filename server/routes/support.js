const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const supportController = require('../controllers/supportController');
const { auth, supportTokenAuth } = require('../middleware/auth');

const bannedLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const bannedMessageLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: { error: 'Too many messages. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/ticket', auth, supportController.createTicket);
router.get('/ticket', auth, supportController.getMyTicket);
router.get('/messages', auth, supportController.getMessages);
router.post('/message', auth, supportController.sendMessage);
router.post('/banned-request', bannedLimiter, supportController.createBannedTicket);
router.get('/banned-ticket/:ticketId/messages', supportTokenAuth, supportController.getBannedMessages);
router.post('/banned-ticket/:ticketId/message', supportTokenAuth, bannedMessageLimiter, supportController.sendBannedMessage);

module.exports = router;
