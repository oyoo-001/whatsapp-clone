const { CallLog, User } = require('../models');
const { Op } = require('sequelize');

exports.initiateCall = async (req, res) => {
  try {
    const { receiverId, callType, isGroupCall, groupId } = req.body;

    if (!receiverId && !isGroupCall) {
      return res.status(400).json({ error: 'Receiver ID is required' });
    }

    if (callType && !['voice', 'video'].includes(callType)) {
      return res.status(400).json({ error: 'Call type must be voice or video' });
    }

    const activeCall = await CallLog.findOne({
      where: {
        [Op.or]: [
          { callerId: receiverId, callStatus: 'answered', endTime: null },
          { receiverId: receiverId, callStatus: 'answered', endTime: null },
        ],
      },
    });

    const callLog = await CallLog.create({
      callerId: req.user.id,
      receiverId: receiverId || null,
      callType: callType || 'voice',
      isGroupCall: isGroupCall || false,
      groupId: groupId || null,
      callStatus: activeCall ? 'busy' : 'missed',
      startTime: activeCall ? null : new Date(),
      participants: isGroupCall ? [req.user.id, receiverId].filter(Boolean) : [],
    });

    const fullCallLog = await CallLog.findByPk(callLog.id, {
      include: [
        { model: User, as: 'caller', attributes: ['id', 'username', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] },
      ],
    });

    res.status(201).json({
      callLog: fullCallLog,
      isBusy: !!activeCall,
      message: activeCall ? 'User is busy' : 'Call initiated',
    });
  } catch (error) {
    console.error('Initiate call error:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
};

exports.updateCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    const { callStatus } = req.body;

    if (!['answered', 'rejected', 'cancelled', 'ended'].includes(callStatus)) {
      return res.status(400).json({ error: 'Invalid call status' });
    }

    const callLog = await CallLog.findByPk(callId);
    if (!callLog) {
      return res.status(404).json({ error: 'Call log not found' });
    }

    if (callStatus === 'answered') {
      callLog.callStatus = 'answered';
      callLog.startTime = new Date();
    } else if (callStatus === 'ended') {
      callLog.endTime = new Date();
      if (callLog.startTime) {
        callLog.duration = Math.floor((callLog.endTime - callLog.startTime) / 1000);
      }
      callLog.callStatus = 'answered';
    } else {
      callLog.callStatus = callStatus;
    }

    await callLog.save();

    res.json({ callLog, message: `Call ${callStatus}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update call status' });
  }
};

exports.getCallHistory = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const callLogs = await CallLog.findAll({
      where: {
        [Op.or]: [
          { callerId: req.user.id },
          { receiverId: req.user.id },
        ],
      },
      include: [
        { model: User, as: 'caller', attributes: ['id', 'username', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ callLogs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get call history' });
  }
};

exports.joinMeeting = async (req, res) => {
  try {
    const { callId } = req.params;

    const callLog = await CallLog.findByPk(callId);
    if (!callLog || !callLog.isGroupCall) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const participants = callLog.participants || [];
    if (!participants.includes(req.user.id)) {
      participants.push(req.user.id);
    }

    callLog.participants = participants;
    await callLog.save();

    res.json({ callLog, message: 'Joined meeting' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join meeting' });
  }
};

exports.getActiveMeetings = async (req, res) => {
  try {
    const allMeetings = await CallLog.findAll({
      where: {
        isGroupCall: true,
        callStatus: 'answered',
        endTime: null,
      },
    });

    const meetings = allMeetings.filter((m) => {
      const participants = m.participants || [];
      return participants.includes(req.user.id);
    });

    res.json({ meetings });
  } catch (error) {
    console.error('Get active meetings error:', error);
    res.status(500).json({ error: 'Failed to get active meetings' });
  }
};
