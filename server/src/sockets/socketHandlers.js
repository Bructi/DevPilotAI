const { ChatMessage, Notification } = require('../models/mongo/index');

const connectedUsers = new Map(); // userId -> socketId

const initSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── Auth & Presence ──────────────────────────────────────────────────
    socket.on('user:join', ({ userId, userName }) => {
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      socket.userName = userName;
      io.emit('presence:update', { userId, status: 'online' });
      console.log(`👤 User ${userName} (${userId}) joined`);
    });

    // ─── Project Room ──────────────────────────────────────────────────────
    socket.on('project:join', ({ projectId }) => {
      socket.join(`project:${projectId}`);
      socket.join(`project:${projectId}:chat`);
      socket.to(`project:${projectId}`).emit('project:member_joined', {
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    socket.on('project:leave', ({ projectId }) => {
      socket.leave(`project:${projectId}`);
      socket.leave(`project:${projectId}:chat`);
    });

    // ─── Real-Time Chat ────────────────────────────────────────────────────
    socket.on('chat:send', async ({ projectId, content, channel = 'general', type = 'text', mentions = [] }) => {
      try {
        const message = await ChatMessage.create({
          project_id: projectId,
          sender_id: socket.userId,
          content,
          channel,
          type,
          mentions,
        });

        io.to(`project:${projectId}:chat`).emit('chat:message', { message });

        // Notify mentioned users
        if (mentions.length > 0) {
          const notifs = mentions.map(userId => ({
            user_id: userId,
            type: 'mention',
            title: 'You were mentioned',
            message: `${socket.userName} mentioned you in a message`,
            data: { project_id: projectId, message_id: message._id },
            from_user_id: socket.userId,
            project_id: projectId,
          }));
          await Notification.insertMany(notifs);
          mentions.forEach(userId => {
            const socketId = connectedUsers.get(userId);
            if (socketId) io.to(socketId).emit('notification:new', notifs.find(n => n.user_id === userId));
          });
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat:typing', ({ projectId, channel }) => {
      socket.to(`project:${projectId}:chat`).emit('chat:typing', {
        userId: socket.userId,
        userName: socket.userName,
        channel,
      });
    });

    socket.on('chat:stop_typing', ({ projectId }) => {
      socket.to(`project:${projectId}:chat`).emit('chat:stop_typing', { userId: socket.userId });
    });

    // ─── Task Real-Time ────────────────────────────────────────────────────
    socket.on('task:view', ({ taskId, projectId }) => {
      io.to(`project:${projectId}`).emit('task:viewed_by', {
        taskId,
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    // ─── Notifications ─────────────────────────────────────────────────────
    socket.on('notification:read', async ({ notificationId }) => {
      await Notification.findByIdAndUpdate(notificationId, { is_read: true });
    });

    // ─── Personal Room ─────────────────────────────────────────────────────
    socket.on('user:room', ({ userId }) => {
      socket.join(`user:${userId}`);
    });

    // ─── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        io.emit('presence:update', { userId: socket.userId, status: 'offline' });
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

const sendNotificationToUser = (io, userId, notification) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification:new', notification);
  }
};

module.exports = { initSocketHandlers, sendNotificationToUser };
