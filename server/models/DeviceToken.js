const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DeviceToken = sequelize.define('DeviceToken', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  platform: {
    type: DataTypes.ENUM('android', 'ios', 'web'),
    defaultValue: 'android',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'DeviceTokens',
  indexes: [
    { fields: ['userId'] },
    { fields: ['token'], unique: true },
  ],
});

module.exports = DeviceToken;
