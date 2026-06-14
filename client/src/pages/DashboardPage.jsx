import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FolderKanban, CheckCircle2, Clock, Zap, TrendingUp,
  ArrowRight, Plus, Activity, Bot, Sparkles, Target,
} from 'lucide-react';
import { analyticsAPI, projectAPI } from '../services/api';
import { useAuthStore } from '../store';
import { format } from 'date-fns';

const statusColors = {
  planning: '#6366f1', development: '#3b82f6', testing: '#f59e0b',
  deployment: '#10b981', completed: '#10b981', paused: '#94a3b8', maintenance: '#8b5cf6',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: overview } = useQuery({ queryKey: ['analytics-overview'], queryFn: () => analyticsAPI.getOverview().then(r => r.data) });
  const { data: projectsData } = useQuery({ queryKey: ['projects-recent'], queryFn: () => projectAPI.getAll({ limit: 6, sort: '-updatedAt' }).then(r => r.data) });

  const stats = [
    { label: 'Total Projects', value: overview?.totalProjects ?? '–', icon: FolderKanban, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Active Tasks', value: overview?.activeTasks ?? '–', icon: Target, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { label: 'Completed', value: overview?.completedProjects ?? '–', icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'AI Suggestions', value: '24', icon: Sparkles, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  ];

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4, color: 'var(--text-primary)' }}>
              {greeting}, {user?.name?.split(' ')[0] || 'Developer'} 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {format(new Date(), 'EEEE, MMMM do yyyy')} · Here's your project overview
            </p>
          </div>
          <Link to="/projects?new=true" className="btn btn-primary" style={{ gap: 8 }}>
            <Plus size={16} /> New Project
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <stat.icon size={22} style={{ color: stat.color }} />
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>

        {/* Recent Projects */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Projects</h2>
              <Link to="/projects" style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {projectsData?.projects?.length > 0 ? (
                projectsData.projects.map(project => (
                  <ProjectCard key={project._id} project={project} />
                ))
              ) : (
                <EmptyProjects />
              )}
            </div>
          </div>
        </motion.div>

        {/* AI Panel + Activity */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* AI Assistant Quick */}
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>AI Assistant</div>
                <div style={{ fontSize: '0.7rem', color: '#818cf8' }}>Powered by DevPilot AI</div>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16, lineHeight: 1.5 }}>
              Get AI help with sprint planning, code review, documentation, and project analysis.
            </p>
            <Link to="/projects" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, textDecoration: 'none', color: '#818cf8', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}>
              <Sparkles size={14} /> Start AI Chat
            </Link>
          </div>

          {/* Quick Tips */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} style={{ color: '#10b981' }} /> Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Create a new project', to: '/projects?new=true', icon: FolderKanban, color: '#6366f1' },
                { label: 'Plan a sprint', to: '/projects', icon: Zap, color: '#8b5cf6' },
                { label: 'Review analytics', to: '/projects', icon: TrendingUp, color: '#10b981' },
              ].map(action => (
                <Link key={action.label} to={action.to} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 10, textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-glass-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-glass)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <action.icon size={14} style={{ color: action.color }} /> {action.label} <ArrowRight size={12} style={{ marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ProjectCard({ project }) {
  const progress = project.progress?.completion_percentage || 0;
  const statusColor = statusColors[project.status] || '#6366f1';

  return (
    <Link to={`/projects/${project._id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--border-color)', textDecoration: 'none', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-glass-hover)'; e.currentTarget.style.borderColor = 'var(--border-color-light)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-glass)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${statusColor}1a`, border: `1px solid ${statusColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
        {project.icon || '📁'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <div style={{ flex: 1, height: 4, background: 'var(--border-color)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${statusColor}, ${statusColor}99)`, borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>{progress}%</span>
        </div>
      </div>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: statusColor, textTransform: 'capitalize', flexShrink: 0 }}>
        {project.status}
      </div>
    </Link>
  );
}

function EmptyProjects() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569' }}>
      <FolderKanban size={40} style={{ color: '#334155', margin: '0 auto 12px' }} />
      <p style={{ fontWeight: 600, marginBottom: 4 }}>No projects yet</p>
      <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: 16 }}>Create your first project to get started</p>
      <Link to="/projects?new=true" className="btn btn-primary btn-sm">
        <Plus size={14} /> New Project
      </Link>
    </div>
  );
}
