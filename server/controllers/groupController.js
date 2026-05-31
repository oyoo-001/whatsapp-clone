const crypto = require('crypto');
const { Group, GroupMember, GroupMessage, User } = require('../models');
const { Op } = require('sequelize');

const genCode = () => crypto.randomBytes(6).toString('base64url').slice(0, 8);

const ensureInviteCode = async (group) => {
  if (!group.inviteCode) {
    group.inviteCode = genCode();
    await group.save();
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required' });

    const group = await Group.create({ name: name.trim(), description: description || null, createdBy: req.user.id, inviteCode: genCode() });

    await GroupMember.create({ groupId: group.id, userId: req.user.id, role: 'admin' });

    const fullGroup = await Group.findByPk(group.id, {
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status'],
          through: { attributes: ['role', 'joinedAt'] },
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar'],
        },
      ],
    });

    res.status(201).json({ group: fullGroup });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

exports.getMyGroups = async (req, res) => {
  try {
    const myGroupIds = await GroupMember.findAll({
      where: { userId: req.user.id },
      attributes: ['groupId'],
    });

    const groups = await Group.findAll({
      where: { id: myGroupIds.map((g) => g.groupId) },
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status'],
          through: { attributes: ['role', 'joinedAt', 'unreadCount'] },
        },
        {
          model: GroupMessage,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']],
          include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to get groups' });
  }
};

exports.getGroupByInviteCode = async (req, res) => {
  try {
    const { code } = req.params;
    const group = await Group.findOne({
      where: { inviteCode: code },
      include: [
        { model: User, as: 'participants', attributes: ['id', 'username', 'avatar'], through: { attributes: [] } },
        { model: User, as: 'creator', attributes: ['id', 'username', 'avatar'] },
      ],
    });

    if (!group) return res.status(404).json({ error: 'Invalid invite code' });

    res.json({
      group: {
        ...group.toJSON(),
        memberCount: group.participants?.length || 0,
      },
    });
  } catch (error) {
    console.error('Get group by invite error:', error);
    res.status(500).json({ error: 'Failed to get group' });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
          through: { attributes: ['role', 'joinedAt', 'unreadCount'] },
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar'],
        },
      ],
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    await ensureInviteCode(group);

    const membership = await GroupMember.findOne({
      where: { groupId: group.id, userId: req.user.id },
    });
    if (!membership) return res.status(403).json({ error: 'Not a group member' });

    res.json({ group, role: membership.role });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Failed to get group' });
  }
};

exports.addMember = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const membership = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    const [member, created] = await GroupMember.findOrCreate({
      where: { groupId, userId },
      defaults: { groupId, userId, role: 'member' },
    });

    if (!created) return res.status(400).json({ error: 'Already a member' });

    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status'],
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${userId}`).emit('group:member-added', { groupId, user });
      const members = await GroupMember.findAll({ where: { groupId } });
      members.forEach((m) => {
        if (m.userId !== req.user.id && m.userId !== userId) {
          io.to(`user-${m.userId}`).emit('group:member-added', { groupId, user });
        }
      });
    }

    res.status(201).json({ member: { ...member.toJSON(), user } });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userId } = req.body;

    const membership = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    const deleted = await GroupMember.destroy({ where: { groupId, userId } });
    if (!deleted) return res.status(404).json({ error: 'Member not found' });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${userId}`).emit('group:member-removed', { groupId });
      const members = await GroupMember.findAll({ where: { groupId } });
      members.forEach((m) => {
        if (m.userId !== req.user.id) {
          io.to(`user-${m.userId}`).emit('group:member-removed', { groupId, removedUserId: userId });
        }
      });
    }

    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

exports.exitGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const membership = await GroupMember.findOne({ where: { groupId, userId } });
    if (!membership) return res.status(404).json({ error: 'Not a member of this group' });

    await GroupMember.destroy({ where: { groupId, userId } });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${userId}`).emit('group:member-removed', { groupId });
      const members = await GroupMember.findAll({ where: { groupId } });
      members.forEach((m) => {
        io.to(`user-${m.userId}`).emit('group:member-removed', { groupId, removedUserId: userId });
      });
    }

    res.json({ message: 'Exited group' });
  } catch (error) {
    console.error('Exit group error:', error);
    res.status(500).json({ error: 'Failed to exit group' });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { name, description } = req.body;

    const membership = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update group' });
    }

    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (name && name.trim()) group.name = name.trim();
    if (description !== undefined) group.description = description || null;
    await group.save();

    const fullGroup = await Group.findByPk(groupId, {
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status', 'isOnline', 'lastSeen'],
          through: { attributes: ['role', 'joinedAt'] },
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar'],
        },
      ],
    });

    const io = req.app.get('io');
    if (io) {
      const members = await GroupMember.findAll({ where: { groupId } });
      members.forEach((m) => {
        io.to(`user-${m.userId}`).emit('group:updated', { groupId, group: fullGroup });
      });
    }

    res.json({ group: fullGroup });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { avatar } = req.body;

    const membership = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update group avatar' });
    }

    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    group.avatar = avatar;
    await group.save();

    const io = req.app.get('io');
    if (io) {
      const members = await GroupMember.findAll({ where: { groupId } });
      members.forEach((m) => {
        io.to(`user-${m.userId}`).emit('group:avatar-updated', { groupId, avatar });
      });
    }

    res.json({ avatar: group.avatar });
  } catch (error) {
    console.error('Update group avatar error:', error);
    res.status(500).json({ error: 'Failed to update group avatar' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content, messageType, fileUrl, replyToId, replyToContent, replyToSenderId, replyToSenderName } = req.body;
    const groupId = req.params.id;

    const isMember = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!isMember) return res.status(403).json({ error: 'Not a group member' });

    const message = await GroupMessage.create({
      groupId,
      senderId: req.user.id,
      content: content || null,
      messageType: messageType || 'text',
      fileUrl: fileUrl || null,
      replyToId: replyToId || null,
      replyToContent: replyToContent || null,
      replyToSenderId: replyToSenderId || null,
      replyToSenderName: replyToSenderName || null,
    });

    const fullMessage = await GroupMessage.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] }],
    });

    await Group.update({ updatedAt: new Date() }, { where: { id: groupId } });

    const io = req.app.get('io');
    if (io) {
      const members = await GroupMember.findAll({ where: { groupId } });
      for (const m of members) {
        if (m.userId !== req.user.id) {
          await GroupMember.increment('unreadCount', { where: { id: m.id } });
          io.to(`user-${m.userId}`).emit('group:message', { groupId, message: fullMessage });
        }
      }
    }

    res.status(201).json({ message: fullMessage });
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const groupId = req.params.id;

    const isMember = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!isMember) return res.status(403).json({ error: 'Not a group member' });

    const { before, limit = 50 } = req.query;
    const where = { groupId };
    if (before) {
      where.createdAt = { [Op.lt]: new Date(before) };
    }

    const messages = await GroupMessage.findAll({
      where,
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'avatar'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { messageId } = req.body;

    const membership = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete messages' });
    }

    const message = await GroupMessage.findOne({ where: { id: messageId, groupId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    await message.destroy();

    const io = req.app.get('io');
    if (io) {
      const members = await GroupMember.findAll({ where: { groupId } });
      members.forEach((m) => {
        io.to(`user-${m.userId}`).emit('group:message-deleted', { groupId, messageId });
      });
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete group message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

exports.addMembers = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array required' });
    }

    const membership = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    const added = [];
    for (const userId of userIds) {
      const [member, created] = await GroupMember.findOrCreate({
        where: { groupId, userId },
        defaults: { groupId, userId, role: 'member' },
      });
      if (created) {
        const user = await User.findByPk(userId, {
          attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status'],
        });
        added.push({ ...member.toJSON(), user });
      }
    }

    const io = req.app.get('io');
    if (io) {
      const members = await GroupMember.findAll({ where: { groupId } });
      members.forEach((m) => {
        const isNew = added.some((a) => a.userId === m.userId);
        if (m.userId !== req.user.id) {
          io.to(`user-${m.userId}`).emit('group:members-added', { groupId, members: added });
        }
      });
    }

    res.status(201).json({ members: added });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
};

exports.markGroupAsRead = async (req, res) => {
  try {
    const groupId = req.params.id;
    const result = await GroupMember.update(
      { unreadCount: 0 },
      { where: { groupId, userId: req.user.id } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark group as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

exports.generateInviteCode = async (req, res) => {
  try {
    const groupId = req.params.id;

    const membership = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can generate invite link' });
    }

    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!group.inviteCode) {
      group.inviteCode = genCode();
      await group.save();
    }

    res.json({ inviteCode: group.inviteCode });
  } catch (error) {
    console.error('Generate group invite error:', error);
    res.status(500).json({ error: 'Failed to generate invite link' });
  }
};

exports.regenerateGroupInviteCode = async (req, res) => {
  try {
    const groupId = req.params.id;

    const membership = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can regenerate invite link' });
    }

    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    group.inviteCode = genCode();
    await group.save();

    res.json({ inviteCode: group.inviteCode });
  } catch (error) {
    console.error('Regenerate group invite error:', error);
    res.status(500).json({ error: 'Failed to regenerate invite link' });
  }
};

exports.joinGroupByInvite = async (req, res) => {
  try {
    const code = req.body.code || req.body.inviteCode;
    if (!code) return res.status(400).json({ error: 'Invite code required' });

    const group = await Group.findOne({ where: { inviteCode: code } });
    if (!group) return res.status(404).json({ error: 'Invalid invite code' });

    const [member, created] = await GroupMember.findOrCreate({
      where: { groupId: group.id, userId: req.user.id },
      defaults: { groupId: group.id, userId: req.user.id, role: 'member' },
    });

    if (!created) return res.status(400).json({ error: 'Already a member of this group' });

    const fullGroup = await Group.findByPk(group.id, {
      include: [
        {
          model: User,
          as: 'participants',
          attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status'],
          through: { attributes: ['role', 'joinedAt'] },
        },
      ],
    });

    res.json({ group: fullGroup });
  } catch (error) {
    console.error('Join group by invite error:', error);
    res.status(500).json({ error: 'Failed to join group' });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;

    const membership = await GroupMember.findOne({ where: { groupId, userId: req.user.id } });
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change roles' });
    }

    const target = await GroupMember.findOne({ where: { groupId, userId } });
    if (!target) return res.status(404).json({ error: 'Member not found' });

    target.role = 'admin';
    await target.save();

    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'phoneNumber', 'avatar', 'status'],
    });

    const io = req.app.get('io');
    if (io) {
      const members = await GroupMember.findAll({ where: { groupId } });
      members.forEach((m) => {
        io.to(`user-${m.userId}`).emit('group:member-role-updated', {
          groupId, userId, role: 'admin', user,
        });
      });
    }

    res.json({ member: { userId, role: 'admin' } });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};
