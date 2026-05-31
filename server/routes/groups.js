const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { auth } = require('../middleware/auth');

router.get('/invite/:code', groupController.getGroupByInviteCode);
router.post('/', auth, groupController.createGroup);
router.get('/', auth, groupController.getMyGroups);
router.get('/:id', auth, groupController.getGroup);
router.put('/:id', auth, groupController.updateGroup);
router.put('/:id/avatar', auth, groupController.updateAvatar);
router.post('/:id/members', auth, groupController.addMembers);
router.post('/:id/members/add', auth, groupController.addMember);
router.delete('/:id/members', auth, groupController.removeMember);
router.post('/:id/exit', auth, groupController.exitGroup);
router.put('/:id/members/:userId/role', auth, groupController.updateMemberRole);
router.post('/:id/messages', auth, groupController.sendMessage);
router.get('/:id/messages', auth, groupController.getMessages);
router.delete('/:id/messages', auth, groupController.deleteMessage);
router.put('/:id/read', auth, groupController.markGroupAsRead);
router.post('/:id/invite', auth, groupController.generateInviteCode);
router.post('/:id/regenerate-invite', auth, groupController.regenerateGroupInviteCode);
router.post('/join', auth, groupController.joinGroupByInvite);
router.post('/join/invite', auth, groupController.joinGroupByInvite);

module.exports = router;
