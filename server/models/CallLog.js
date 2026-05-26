const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CallLog = sequelize.define('CallLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  callerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  callType: {
    type: DataTypes.ENUM('voice', 'video'),
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in seconds',
  },
  callStatus: {
    type: DataTypes.ENUM('missed', 'answered', 'rejected', 'cancelled', 'busy'),
    defaultValue: 'missed',
  },
  isGroupCall: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  participants: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
}, {
  timestamps: true,
});

module.exports = CallLog;
