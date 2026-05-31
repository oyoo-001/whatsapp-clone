const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChannelPost = sequelize.define('ChannelPost', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  channelId: {
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
    type: DataTypes.STRING(20),
    defaultValue: 'text',
  },
  fileUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'ChannelPosts',
});

module.exports = ChannelPost;
