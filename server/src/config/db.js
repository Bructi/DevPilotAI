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

// ─── MySQL / Sequelize Connection ─────────────────────────────────────────────
const sequelize = new Sequelize(
  process.env.MYSQL_DB || 'devpilot_ai',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_PASSWORD || '',
  {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected successfully');
    await sequelize.sync({ alter: true });
    console.log('✅ MySQL models synchronized');
  } catch (error) {
    console.warn('⚠️  MySQL not available (start XAMPP to enable):', error.message.split('\n')[0]);
    console.warn('    The app will run with MongoDB only. Auth requires MySQL.');
  }
};

module.exports = { connectMongoDB, connectMySQL, sequelize };
