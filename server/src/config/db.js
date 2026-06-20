const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/devpilot_ai');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

// ─── SQL / Sequelize Connection ────────────────────────────────────────────────
const dialect = process.env.DB_DIALECT || 'sqlite';

const sequelize = new Sequelize({
  dialect: dialect,
  storage: process.env.SQLITE_STORAGE || './devpilot_ai.sqlite',
  logging: false,
});

const connectSQL = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ SQLite connected successfully`);
    await sequelize.sync({ alter: true });
    console.log(`✅ SQLite models synchronized`);

    // Seed roles
    const { Role } = require('../models/sqlite/index');
    const defaultRoles = [
      { name: 'admin', description: 'Full access to all project resources' },
      { name: 'project_manager', description: 'Can manage sprints, tasks, and team' },
      { name: 'developer', description: 'Can write code, complete tasks' },
      { name: 'tester', description: 'Can review code, run tests, report bugs' },
      { name: 'viewer', description: 'Read-only access to project' },
    ];
    for (const role of defaultRoles) {
      await Role.findOrCreate({ where: { name: role.name }, defaults: role });
    }
    console.log('✅ Roles seeded');
  } catch (error) {
    console.warn(`⚠️  SQLite not available:`, error);
    console.warn(`    The app will run with MongoDB only. Auth requires SQLite.`);
  }
};

module.exports = { connectMongoDB, connectSQL, sequelize };
