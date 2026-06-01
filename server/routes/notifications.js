const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.post('/register-token', auth, notificationController.registerToken);
router.post('/unregister-token', auth, notificationController.unregisterToken);

module.exports = router;
