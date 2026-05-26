const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');

router.get('/search', auth, userController.searchUsers);
router.get('/search-by-phone', auth, userController.searchByPhoneNumber);
router.get('/contacts', auth, userController.getContacts);
router.post('/contacts', auth, userController.addContact);
router.delete('/contacts/:contactId', auth, userController.removeContact);
router.put('/contacts/:contactUserId/block', auth, userController.blockContact);
router.get('/:userId', auth, userController.getUserProfile);

module.exports = router;
