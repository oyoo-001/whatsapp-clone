const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const { auth } = require('../middleware/auth');

router.post('/', auth, statusController.createStatus);
router.get('/feed', auth, statusController.getStatusFeed);
router.get('/mine', auth, statusController.getMyStatuses);
router.post('/:id/view', auth, statusController.viewStatus);
router.get('/:id/viewers', auth, statusController.getStatusViewers);
router.delete('/:id', auth, statusController.deleteStatus);

module.exports = router;
