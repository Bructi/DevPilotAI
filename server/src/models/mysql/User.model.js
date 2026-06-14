const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { len: [2, 100] },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true, // null for Google OAuth users
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
  },
  google_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  two_fa_secret: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  two_fa_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verification_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  github_username: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  github_pat: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  github_data: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  },
  jira_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  jira_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  jira_token: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  jira_data: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'UTC',
  },
  preferences: {
    type: DataTypes.JSON,
    defaultValue: { theme: 'dark', notifications: true, language: 'en' },
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash') && user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    },
  },
});

User.prototype.comparePassword = async function(password) {
  if (!this.password_hash) return false;
  return bcrypt.compare(password, this.password_hash);
};

User.prototype.toSafeObject = function() {
  const { password_hash, two_fa_secret, verification_token, github_pat, jira_token, ...safe } = this.toJSON();
  return safe;
};

module.exports = User;
