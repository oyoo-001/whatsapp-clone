const crypto = require('crypto');
const { Channel, ChannelFollower, ChannelPost, User } = require('../models');
const { Op } = require('sequelize');

const genCode = () => crypto.randomBytes(6).toString('base64url').slice(0, 8);

exports.createChannel = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Channel name is required' });

    const channel = await Channel.create({
      name: name.trim(),
      description: description || null,
      createdBy: req.user.id,
      inviteCode: genCode(),
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.user.id}`).emit('channel:created', { channel });
    }

    res.status(201).json({ channel });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

exports.getMyChannels = async (req, res) => {
  try {
    const myChannelIds = await ChannelFollower.findAll({
      where: { userId: req.user.id },
      attributes: ['channelId'],
    });

    const followedIds = myChannelIds.map(c => c.channelId);

    const channels = await Channel.findAll({
      where: {
        [Op.or]: [
          { createdBy: req.user.id },
          { id: followedIds },
        ],
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar'],
        },
        {
          model: ChannelPost,
          as: 'posts',
          limit: 1,
          order: [['createdAt', 'DESC']],
          include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
        },
        {
          model: ChannelFollower,
          as: 'followers',
          attributes: ['userId'],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const enriched = channels.map(ch => ({
      ...ch.toJSON(),
      followerCount: ch.followers?.length || 0,
      isFollowing: ch.followers?.some(f => f.userId === req.user.id) || ch.createdBy === req.user.id,
      isOwner: ch.createdBy === req.user.id,
    }));

    res.json({ channels: enriched });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Failed to get channels' });
  }
};

exports.getChannel = async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar'],
        },
        {
          model: ChannelFollower,
          as: 'followers',
          attributes: ['userId'],
        },
      ],
    });

    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    if (!channel.inviteCode) {
      channel.inviteCode = genCode();
      await channel.save();
    }

    const isFollowing = channel.followers?.some(f => f.userId === req.user.id);
    const isOwner = channel.createdBy === req.user.id;

    res.json({
      channel: {
        ...channel.toJSON(),
        followerCount: channel.followers?.length || 0,
        isFollowing: isFollowing || isOwner,
        isOwner,
      },
    });
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ error: 'Failed to get channel' });
  }
};

exports.followChannel = async (req, res) => {
  try {
    const channelId = req.params.id;
    const channel = await Channel.findByPk(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const [follower, created] = await ChannelFollower.findOrCreate({
      where: { channelId, userId: req.user.id },
      defaults: { channelId, userId: req.user.id },
    });

    if (!created) return res.status(400).json({ error: 'Already following this channel' });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${channel.createdBy}`).emit('channel:new-follower', { channelId, userId: req.user.id });
    }

    res.status(201).json({ follower });
  } catch (error) {
    console.error('Follow channel error:', error);
    res.status(500).json({ error: 'Failed to follow channel' });
  }
};

exports.unfollowChannel = async (req, res) => {
  try {
    const channelId = req.params.id;
    const deleted = await ChannelFollower.destroy({
      where: { channelId, userId: req.user.id },
    });

    if (!deleted) return res.status(404).json({ error: 'Not following this channel' });

    res.json({ message: 'Unfollowed channel' });
  } catch (error) {
    console.error('Unfollow channel error:', error);
    res.status(500).json({ error: 'Failed to unfollow channel' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const channelId = req.params.id;
    const { content, messageType, fileUrl } = req.body;

    const channel = await Channel.findByPk(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.createdBy !== req.user.id) return res.status(403).json({ error: 'Only channel owner can post' });

    const post = await ChannelPost.create({
      channelId,
      senderId: req.user.id,
      content: content || null,
      messageType: messageType || 'text',
      fileUrl: fileUrl || null,
    });

    await Channel.update({ updatedAt: new Date() }, { where: { id: channelId } });

    const fullPost = await ChannelPost.findByPk(post.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] }],
    });

    const io = req.app.get('io');
    if (io) {
      const followers = await ChannelFollower.findAll({ where: { channelId } });
      followers.forEach(f => {
        io.to(`user-${f.userId}`).emit('channel:post', { channelId, post: fullPost });
      });
    }

    res.status(201).json({ post: fullPost });
  } catch (error) {
    console.error('Create channel post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const channelId = req.params.id;
    const { before, limit = 50 } = req.query;
    const where = { channelId };
    if (before) {
      where.createdAt = { [Op.lt]: new Date(before) };
    }

    const posts = await ChannelPost.findAll({
      where,
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
    });

    res.json({ posts: posts.reverse() });
  } catch (error) {
    console.error('Get channel posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
};

exports.updateChannel = async (req, res) => {
  try {
    const channelId = req.params.id;
    const { name, description, avatar } = req.body;

    const channel = await Channel.findByPk(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.createdBy !== req.user.id) return res.status(403).json({ error: 'Only the owner can update' });

    if (name && name.trim()) channel.name = name.trim();
    if (description !== undefined) channel.description = description || null;
    if (avatar !== undefined) channel.avatar = avatar;
    await channel.save();

    res.json({ channel });
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
};

exports.deleteChannel = async (req, res) => {
  try {
    const channelId = req.params.id;
    const channel = await Channel.findByPk(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.createdBy !== req.user.id) return res.status(403).json({ error: 'Only the owner can delete' });

    await ChannelPost.destroy({ where: { channelId } });
    await ChannelFollower.destroy({ where: { channelId } });
    await channel.destroy();

    res.json({ message: 'Channel deleted' });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
};

exports.joinByInvite = async (req, res) => {
  try {
    const code = req.body.code || req.body.inviteCode;
    if (!code) return res.status(400).json({ error: 'Invite code required' });

    const channel = await Channel.findOne({ where: { inviteCode: code } });
    if (!channel) return res.status(404).json({ error: 'Invalid invite code' });

    const [follower, created] = await ChannelFollower.findOrCreate({
      where: { channelId: channel.id, userId: req.user.id },
      defaults: { channelId: channel.id, userId: req.user.id },
    });

    res.json({ channel: { ...channel.toJSON(), isFollowing: true, isOwner: false }, alreadyFollowing: !created });
  } catch (error) {
    console.error('Join by invite error:', error);
    res.status(500).json({ error: 'Failed to join channel' });
  }
};

exports.regenerateInviteCode = async (req, res) => {
  try {
    const channelId = req.params.id;
    const channel = await Channel.findByPk(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.createdBy !== req.user.id) return res.status(403).json({ error: 'Only the owner can regenerate' });

    channel.inviteCode = genCode();
    await channel.save();

    res.json({ inviteCode: channel.inviteCode });
  } catch (error) {
    console.error('Regenerate invite error:', error);
    res.status(500).json({ error: 'Failed to regenerate invite code' });
  }
};

exports.getChannelByInviteCode = async (req, res) => {
  try {
    const { code } = req.params;
    const channel = await Channel.findOne({
      where: { inviteCode: code },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'avatar'] },
        { model: ChannelFollower, as: 'followers', attributes: ['userId'] },
      ],
    });

    if (!channel) return res.status(404).json({ error: 'Invalid invite code' });

    res.json({
      channel: {
        ...channel.toJSON(),
        followerCount: channel.followers?.length || 0,
      },
    });
  } catch (error) {
    console.error('Get channel by invite error:', error);
    res.status(500).json({ error: 'Failed to get channel' });
  }
};

exports.getExploreChannels = async (req, res) => {
  try {
    const channels = await Channel.findAll({
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar'],
        },
        {
          model: ChannelFollower,
          as: 'followers',
          attributes: ['userId'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const enriched = channels.map(ch => ({
      ...ch.toJSON(),
      followerCount: ch.followers?.length || 0,
      isFollowing: ch.followers?.some(f => f.userId === req.user.id) || ch.createdBy === req.user.id,
      isOwner: ch.createdBy === req.user.id,
    }));

    res.json({ channels: enriched });
  } catch (error) {
    console.error('Explore channels error:', error);
    res.status(500).json({ error: 'Failed to explore channels' });
  }
};
