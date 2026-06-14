import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, Search, Sun, Moon, Monitor, Menu, Sparkles, X, Command } from 'lucide-react';
import { useUIStore, useAuthStore, useNotificationStore } from '../../store';

const themes = [
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'amoled', icon: Monitor, label: 'AMOLED' },
];

// Breadcrumb builder
const useBreadcrumbs = () => {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  const crumbs = [{ label: 'Home', to: '/dashboard' }];
  let path = '';
  parts.forEach((part, i) => {
    path += `/${part}`;
    const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
    crumbs.push({ label: part.length === 24 ? '...' : label, to: path });
  });
  return crumbs;
};

export default function Topbar() {
  const { sidebarCollapsed, setSidebarOpen } = useUIStore();
  const { theme, setTheme } = useUIStore();
  const { unreadCount } = useNotificationStore();
  const { user } = useAuthStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const breadcrumbs = useBreadcrumbs();

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--topbar-height)',
      background: 'var(--bg-secondary)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      padding: `0 24px 0 calc(${sidebarCollapsed ? '72px' : 'var(--sidebar-width)'} + 24px)`,
      transition: 'padding-left 0.3s ease',
      zIndex: 30,
      gap: 16,
    }}>
      {/* Mobile menu */}
      <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(true)} style={{ display: 'none' }}>
        <Menu size={20} />
      </button>

      {/* Breadcrumbs */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={`${crumb.to}-${i}`}>
            {i > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/</span>}
            <Link
              to={crumb.to}
              style={{
                color: i === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {crumb.label}
            </Link>
          </React.Fragment>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Search */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setSearchOpen(true)}
          style={{ color: '#94a3b8', position: 'relative' }}
          title="Search (Ctrl+K)"
        >
          <Search size={18} />
        </button>

        {/* AI Quick Access */}
        <button
          className="btn btn-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#818cf8',
            gap: 6,
            padding: '6px 12px',
          }}
        >
          <Sparkles size={14} />
          <span style={{ display: 'none' }}>AI</span>
        </button>

        {/* Theme toggle */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            style={{ color: '#94a3b8' }}
            title="Theme"
          >
            {theme === 'light' ? <Sun size={18} /> : theme === 'amoled' ? <Monitor size={18} /> : <Moon size={18} />}
          </button>
          {themeMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setThemeMenuOpen(false)} />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 10, padding: 8, zIndex: 100, minWidth: 140,
                boxShadow: 'var(--shadow-md)',
              }}>
                {themes.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { setTheme(t.value); setThemeMenuOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8, border: 'none',
                      background: theme === t.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: theme === t.value ? '#818cf8' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                    }}
                  >
                    <t.icon size={14} /> {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Notifications */}
        <Link to="/notifications" style={{ position: 'relative', textDecoration: 'none' }}>
          <button className="btn btn-ghost btn-icon" style={{ color: '#94a3b8' }} title="Notifications">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 16, height: 16, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontSize: '0.6rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </Link>

        {/* User Avatar */}
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <div className="avatar avatar-sm" style={{ cursor: 'pointer', border: '2px solid rgba(99,102,241,0.4)' }}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              user?.name?.[0]?.toUpperCase() || 'U'
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
