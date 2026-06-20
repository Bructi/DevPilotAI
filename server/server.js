require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectMongoDB, connectSQL } = require('./src/config/db');
const { initSocketHandlers } = require('./src/sockets/socketHandlers');

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./src/routes/auth.routes');
const projectRoutes = require('./src/routes/project.routes');
const sprintRoutes = require('./src/routes/sprint.routes');
const teamRoutes = require('./src/routes/team.routes');
const chatRoutes = require('./src/routes/chat.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const fileRoutes = require('./src/routes/file.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');
const userRoutes = require('./src/routes/user.routes');
const aiRoutes = require('./src/routes/ai.routes');

const app = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);
initSocketHandlers(io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth/', authLimiter);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DevPilot AI Server',
    version: '1.0.0',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectMongoDB();
  await connectSQL();

  server.listen(PORT, () => {
    console.log(`\n🚀 DevPilot AI Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

startServer();
