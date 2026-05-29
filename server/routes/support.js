const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { auth } = require('../middleware/auth');

router.post('/ticket', auth, supportController.createTicket);
router.get('/ticket', auth, supportController.getMyTicket);
router.get('/messages', auth, supportController.getMessages);
router.post('/message', auth, supportController.sendMessage);

module.exports = router;
