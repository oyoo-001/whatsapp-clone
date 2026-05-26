const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
    messageType: {
    type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'gif'),
    defaultValue: 'text',
  },
  fileUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isDelivered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  replyToId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  replyToContent: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  reactions: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  isEdited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isForwarded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

module.exports = Message;
