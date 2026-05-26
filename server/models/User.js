const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
    },
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
  },
  status: {
    type: DataTypes.STRING(150),
    allowNull: true,
    defaultValue: 'Hey there! I am using WhatsApp Clone',
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  publicKey: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, config.bcryptSaltRounds);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, config.bcryptSaltRounds);
      }
    },
  },
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
