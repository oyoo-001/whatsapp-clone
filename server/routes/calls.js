const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { auth } = require('../middleware/auth');

router.get('/history', auth, callController.getCallHistory);
router.get('/meetings/active', auth, callController.getActiveMeetings);
router.post('/initiate', auth, callController.initiateCall);
router.put('/:callId/status', auth, callController.updateCallStatus);
router.post('/:callId/join', auth, callController.joinMeeting);

module.exports = router;
