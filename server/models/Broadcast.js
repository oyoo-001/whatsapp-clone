const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Broadcast = sequelize.define('Broadcast', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
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
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

module.exports = Broadcast;
