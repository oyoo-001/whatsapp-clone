const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChannelFollower = sequelize.define('ChannelFollower', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  channelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'ChannelFollowers',
  indexes: [
    {
      unique: true,
      fields: ['channelId', 'userId'],
    },
  ],
});

module.exports = ChannelFollower;
