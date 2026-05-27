const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { auth } = require('../middleware/auth');

router.post('/', auth, groupController.createGroup);
router.get('/', auth, groupController.getMyGroups);
router.get('/:id', auth, groupController.getGroup);
router.put('/:id', auth, groupController.updateGroup);
router.put('/:id/avatar', auth, groupController.updateAvatar);
router.post('/:id/members', auth, groupController.addMembers);
router.post('/:id/members/add', auth, groupController.addMember);
router.delete('/:id/members', auth, groupController.removeMember);
router.put('/:id/members/:userId/role', auth, groupController.updateMemberRole);
router.post('/:id/messages', auth, groupController.sendMessage);
router.get('/:id/messages', auth, groupController.getMessages);
router.delete('/:id/messages', auth, groupController.deleteMessage);
router.put('/:id/read', auth, groupController.markGroupAsRead);

module.exports = router;
