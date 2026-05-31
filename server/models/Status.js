const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Status = sequelize.define('Status', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mediaUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  mediaType: {
    type: DataTypes.STRING(20),
    defaultValue: 'text',
  },
  backgroundColor: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'Statuses',
});

module.exports = Status;
