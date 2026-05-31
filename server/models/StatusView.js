const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StatusView = sequelize.define('StatusView', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  statusId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  viewerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'StatusViews',
  indexes: [
    {
      unique: true,
      fields: ['statusId', 'viewerId'],
    },
  ],
});

module.exports = StatusView;
