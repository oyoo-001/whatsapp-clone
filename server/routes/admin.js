const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, adminAuth } = require('../middleware/auth');

router.get('/stats', auth, adminAuth, adminController.getStats);
router.get('/users', auth, adminAuth, adminController.listUsers);
router.put('/users/:userId/ban', auth, adminAuth, adminController.banUser);
router.put('/users/:userId/make-admin', auth, adminAuth, adminController.makeAdmin);
router.put('/users/:userId/verify', auth, adminAuth, adminController.verifyUser);
router.get('/channels', auth, adminAuth, adminController.listChannels);
router.put('/channels/:channelId/verify', auth, adminAuth, adminController.verifyChannel);
router.post('/broadcast', auth, adminAuth, adminController.broadcastMessage);
router.get('/broadcasts', auth, adminController.getBroadcasts);
router.delete('/broadcast/:id', auth, adminAuth, adminController.deleteBroadcast);
router.get('/broadcasts/unread', auth, adminController.getUnreadBroadcasts);
router.put('/broadcasts/:id/read', auth, adminController.markBroadcastRead);
router.get('/messages/:userId', auth, adminAuth, adminController.getMessages);
router.post('/messages', auth, adminAuth, adminController.sendMessage);
router.get('/support/queue', auth, adminAuth, adminController.getSupportQueue);
router.get('/support/history', auth, adminAuth, adminController.getSupportHistory);
router.post('/support/ticket/:id/claim', auth, adminAuth, adminController.claimTicket);
router.post('/support/ticket/:id/resolve', auth, adminAuth, adminController.resolveTicket);
router.get('/support/ticket/:id/messages', auth, adminAuth, adminController.getSupportTicketMessages);
router.post('/support/message', auth, adminAuth, adminController.sendSupportMessage);

module.exports = router;
