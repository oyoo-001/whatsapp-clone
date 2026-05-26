const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { auth } = require('../middleware/auth');

router.post('/', auth, uploadController.uploadFile);
router.post('/multiple', auth, uploadController.uploadMultiple);

module.exports = router;
