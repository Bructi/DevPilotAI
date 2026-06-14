import { io } from 'socket.io-client';
import { useAuthStore } from '../store';

let socket = null;

export const connectSocket = (userId, userName) => {
  if (socket?.connected) return socket;

  socket = io('http://localhost:5000', {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
    socket.emit('user:join', { userId, userName });
    socket.emit('user:room', { userId });
  });

  socket.on('disconnect', () => console.log('🔌 Socket disconnected'));
  socket.on('connect_error', (err) => console.error('Socket error:', err));

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const joinProject = (projectId) => socket?.emit('project:join', { projectId });
export const leaveProject = (projectId) => socket?.emit('project:leave', { projectId });
export const sendChatMessage = (data) => socket?.emit('chat:send', data);
export const sendTyping = (projectId, channel) => socket?.emit('chat:typing', { projectId, channel });
export const sendStopTyping = (projectId) => socket?.emit('chat:stop_typing', { projectId });
