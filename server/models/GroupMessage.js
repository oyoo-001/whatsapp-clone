const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GroupMessage = sequelize.define('GroupMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  messageType: {
    type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'file'),
    defaultValue: 'text',
  },
  fileUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  replyToId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  replyToContent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  replyToSenderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  replyToSenderName: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'GroupMessages',
});

module.exports = GroupMessage;
