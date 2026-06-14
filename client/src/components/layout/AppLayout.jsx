import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuthStore, useUIStore } from '../../store';
import { connectSocket } from '../../services/socket';

export default function AppLayout() {
  const { user } = useAuthStore();
  const { sidebarCollapsed, sidebarOpen, setSidebarOpen } = useUIStore();

  useEffect(() => {
    if (user?.id) connectSocket(user.id, user.name);
  }, [user]);

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
