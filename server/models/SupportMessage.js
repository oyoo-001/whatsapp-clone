const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SupportMessage = sequelize.define('SupportMessage', {
  ticketId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = SupportMessage;
