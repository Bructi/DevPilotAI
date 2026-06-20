const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

// ─── Role Model ───────────────────────────────────────────────────────────────
const Role = sequelize.define('Role', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: {
    type: DataTypes.ENUM('admin', 'project_manager', 'developer', 'tester', 'viewer'),
    allowNull: false,
  },
  description: { type: DataTypes.STRING(255), allowNull: true },
  permissions: { type: DataTypes.JSON, defaultValue: [] },
}, { 
  tableName: 'roles', 
  timestamps: false,
  indexes: [{ unique: true, fields: ['name'] }] 
});

// ─── UserRole (project-level roles) ──────────────────────────────────────────
const UserRole = sequelize.define('UserRole', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  project_id: { type: DataTypes.STRING(255), allowNull: false }, // MongoDB ObjectId string
  role_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'user_roles',
  timestamps: true,
  createdAt: 'assigned_at',
  updatedAt: false,
});

// ─── Team Model ───────────────────────────────────────────────────────────────
const Team = sequelize.define('Team', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  owner_id: { type: DataTypes.UUID, allowNull: false },
  avatar: { type: DataTypes.STRING(500), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'teams',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// ─── TeamMember Model ─────────────────────────────────────────────────────────
const TeamMember = sequelize.define('TeamMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  team_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'member'),
    defaultValue: 'member',
  },
  status: {
    type: DataTypes.ENUM('active', 'invited', 'suspended'),
    defaultValue: 'active',
  },
}, {
  tableName: 'team_members',
  timestamps: true,
  createdAt: 'joined_at',
  updatedAt: false,
});

// ─── Session / Refresh Token ───────────────────────────────────────────────────
const Session = sequelize.define('Session', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  refresh_token: { type: DataTypes.TEXT, allowNull: false },
  device_info: { type: DataTypes.STRING(500), allowNull: true },
  ip_address: { type: DataTypes.STRING(50), allowNull: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  is_revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

// ─── Password Reset ────────────────────────────────────────────────────────────
const PasswordReset = sequelize.define('PasswordReset', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id: { type: DataTypes.UUID, allowNull: false },
  token: { type: DataTypes.STRING(500), allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  is_used: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'password_resets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = { Role, UserRole, Team, TeamMember, Session, PasswordReset };
