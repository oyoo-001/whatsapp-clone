const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { auth } = require('../middleware/auth');

router.get('/conversations', auth, messageController.getConversations);
router.get('/:userId', auth, messageController.getMessages);
router.post('/', auth, messageController.sendMessage);
router.put('/:userId/read', auth, messageController.markAsRead);
router.put('/:messageId/reaction', auth, messageController.addReaction);
router.put('/:messageId/edit', auth, messageController.editMessage);
router.post('/forward', auth, messageController.forwardMessage);
router.delete('/:messageId', auth, messageController.deleteMessage);
router.delete('/conversation/:userId', auth, messageController.deleteConversation);

module.exports = router;
