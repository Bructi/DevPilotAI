import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuthStore, useUIStore, useNotificationStore } from '../../store';
import { connectSocket, getSocket } from '../../services/socket';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { notificationAPI } from '../../services/api';

export default function AppLayout() {
  const { user } = useAuthStore();
  const { sidebarCollapsed, sidebarOpen, setSidebarOpen } = useUIStore();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.id) {
      // Fetch initial unread count
      notificationAPI.getAll({ limit: 1, unread_only: true })
        .then(res => {
          if (res.data?.unread_count !== undefined) {
            useNotificationStore.getState().setUnreadCount(res.data.unread_count);
          }
        })
        .catch(console.error);

      connectSocket(user.id, user.name);
      const socket = getSocket();
      if (socket) {
        socket.on('notification:new', (notif) => {
          toast.success(notif.title || 'New notification', { icon: '🔔' });
          addNotification?.(notif);
          queryClient.invalidateQueries(['notifications']);
        });
      }
      return () => {
        if (socket) socket.off('notification:new');
      };
    }
  }, [user, queryClient, addNotification]);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 40, backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />
      <Topbar />
      <main className="main-content animate-fade-in" style={{ marginLeft: sidebarCollapsed ? '72px' : 'var(--sidebar-width)', transition: 'margin-left 0.3s ease' }}>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
