import React from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, Kanban, Zap, Users, BarChart3,
  Bot, FileText, Bell, Settings, User, ChevronLeft, ChevronRight,
  Rocket, LogOut, Plus, Sparkles,
} from 'lucide-react';
import { useUIStore, useAuthStore } from '../../store';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';


const navMain = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: FolderKanban, label: 'Projects', to: '/projects' },
  { icon: Bell, label: 'Notifications', to: '/notifications' },
];

const navProject = (id) => [
  { icon: LayoutDashboard, label: 'Overview', to: `/projects/${id}` },
  { icon: Kanban, label: 'Kanban Board', to: `/projects/${id}/board` },
  { icon: Zap, label: 'Sprint Planner', to: `/projects/${id}/sprints` },
  { icon: Users, label: 'Team', to: `/projects/${id}/team` },
  { icon: BarChart3, label: 'Analytics', to: `/projects/${id}/analytics` },
  { icon: Bot, label: 'AI Assistant', to: `/projects/${id}/ai` },
  { icon: FileText, label: 'Documents', to: `/projects/${id}/docs` },
];

const navBottom = [
  { icon: User, label: 'Profile', to: '/profile' },
  { icon: Settings, label: 'Settings', to: '/settings' },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, sidebarOpen, setSidebarOpen } = useUIStore();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  // Detect if we're in a project
  const projectId = location.pathname.match(/\/projects\/([^/]+)/)?.[1];

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const sidebarStyle = {
    position: 'fixed',
    top: 0,
    left: sidebarOpen ? 0 : undefined,
    height: '100vh',
    width: sidebarCollapsed ? '72px' : 'var(--sidebar-width)',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.25s ease, left 0.25s ease',
    zIndex: 50,
    backdropFilter: 'blur(20px)',
    overflowX: 'hidden',
    overflowY: 'auto',
  };

  return (
    <aside style={sidebarStyle}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}>
            <Rocket size={18} color="white" />
          </div>
          {!sidebarCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DevPilot</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em' }}>AI PLATFORM</div>
            </div>
          )}
        </div>
        <button onClick={toggleSidebar} className="btn btn-ghost btn-icon" style={{ color: '#64748b', flexShrink: 0 }} title={sidebarCollapsed ? 'Expand' : 'Collapse'}>
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav content */}
      <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Main nav */}
        <NavSection label="Main" collapsed={sidebarCollapsed}>
          {navMain.map(item => (
            <SidebarNavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
          ))}
        </NavSection>

        {/* Quick action - new project */}
        {!sidebarCollapsed && (
          <button
            onClick={() => navigate('/projects?new=true')}
            style={{ margin: '8px 4px', padding: '10px 14px', background: 'rgba(99,102,241,0.1)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, color: '#818cf8', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
          >
            <Plus size={14} /> New Project
          </button>
        )}

        {/* Project nav */}
        {projectId && (
          <NavSection label="Project" collapsed={sidebarCollapsed}>
            {navProject(projectId).map(item => (
              <SidebarNavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
            ))}
          </NavSection>
        )}

        {/* AI badge */}
        {!sidebarCollapsed && (
          <div style={{ margin: '8px 4px', padding: '12px 14px', background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Sparkles size={12} style={{ color: '#818cf8' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em' }}>AI POWERED</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Sprint planning, code review & doc generation ready</p>
          </div>
        )}
      </div>

      {/* User Profile + Bottom nav */}
      <div style={{ padding: '8px 8px', borderTop: '1px solid var(--border-color)' }}>
        {navBottom.map(item => (
          <SidebarNavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
        ))}

        {/* User info */}
        <div style={{ marginTop: 8, padding: sidebarCollapsed ? '8px 4px' : '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-glass)' }}>
          <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>
            {user?.avatar ? <img src={user.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : (user?.name?.[0] || 'U')}
          </div>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          )}
          {!sidebarCollapsed && (
            <button onClick={handleLogout} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)', padding: 4 }} title="Logout">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavSection({ label, children, collapsed }) {
  return (
    <div>
      {!collapsed && (
        <div style={{ padding: '8px 12px 4px', fontSize: '0.65rem', fontWeight: 700, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function SidebarNavItem({ icon: Icon, label, to, collapsed }) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard' || to.split('/').length === 3}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '10px 18px' : '9px 12px',
        borderRadius: 10,
        textDecoration: 'none',
        color: isActive ? '#818cf8' : '#94a3b8',
        background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
        border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
        transition: 'all 0.2s',
        fontSize: '0.875rem',
        fontWeight: isActive ? 600 : 400,
        marginBottom: 2,
        justifyContent: collapsed ? 'center' : 'flex-start',
      })}
      title={collapsed ? label : undefined}
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
    </NavLink>
  );
}
