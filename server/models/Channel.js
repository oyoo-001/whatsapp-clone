const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Channel = sequelize.define('Channel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  inviteCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  },
}, {
  timestamps: true,
  tableName: 'Channels',
});

module.exports = Channel;
