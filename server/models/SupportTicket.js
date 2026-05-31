const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupportTicket = sequelize.define('SupportTicket', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved'),
    defaultValue: 'open',
  },
  contactPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  isBannedRequest: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

module.exports = SupportTicket;
