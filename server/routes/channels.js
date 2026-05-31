const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const { auth } = require('../middleware/auth');

router.get('/invite/:code', channelController.getChannelByInviteCode);
router.post('/', auth, channelController.createChannel);
router.get('/', auth, channelController.getMyChannels);
router.get('/explore', auth, channelController.getExploreChannels);
router.post('/join', auth, channelController.joinByInvite);
router.get('/:id', auth, channelController.getChannel);
router.put('/:id', auth, channelController.updateChannel);
router.delete('/:id', auth, channelController.deleteChannel);
router.post('/:id/follow', auth, channelController.followChannel);
router.delete('/:id/follow', auth, channelController.unfollowChannel);
router.post('/:id/posts', auth, channelController.createPost);
router.get('/:id/posts', auth, channelController.getPosts);
router.post('/:id/regenerate-invite', auth, channelController.regenerateInviteCode);

module.exports = router;
