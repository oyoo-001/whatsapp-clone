const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'The user who owns this contact list',
  },
  contactUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'The user who is added as contact',
  },
  customName: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  isBlocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'contactUserId'],
    },
  ],
});

module.exports = Contact;
