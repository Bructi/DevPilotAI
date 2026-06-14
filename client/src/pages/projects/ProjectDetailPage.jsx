import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Kanban, Zap, Users, BarChart3, Bot, FileText,
  Calendar, GitBranch, Settings, TrendingUp, Clock, Target,
  CheckCircle2, AlertCircle, Edit, Trash2, Loader2, Globe,
  Activity,
} from 'lucide-react';
import { projectAPI, taskAPI } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useProjectStore } from '../../store';

const statusColors = {
  planning: '#6366f1', development: '#3b82f6', testing: '#f59e0b',
  deployment: '#10b981', maintenance: '#8b5cf6', completed: '#10b981', paused: '#94a3b8',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { setCurrentProject } = useProjectStore();

  const { data, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await projectAPI.getOne(projectId);
      const projectData = res.data.project;
      setCurrentProject(projectData);
      return projectData;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => projectAPI.getStats(projectId).then(r => r.data.stats),
  });

  const { data: activityLogs } = useQuery({
    queryKey: ['project-activity', projectId],
    queryFn: () => projectAPI.getActivity(projectId).then(r => r.data.logs),
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectAPI.delete(projectId),
    onSuccess: () => { toast.success('Project deleted'); navigate('/projects'); },
    onError: () => toast.error('Failed to delete project'),
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  const editMutation = useMutation({
    mutationFn: (data) => projectAPI.update(projectId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project', projectId] }); toast.success('Project updated'); setShowEditModal(false); },
    onError: () => toast.error('Failed to update project'),
  });

  const openEditModal = () => {
    if (data) {
      setEditForm({ name: data.name, description: data.description, category: data.category, status: data.status });
      setShowEditModal(true);
    }
  };

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!data) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
      <h2 style={{ color: 'var(--text-primary)' }}>Project not found</h2>
      <Link to="/projects" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
        <ArrowLeft size={14} /> Back to Projects
      </Link>
    </div>
  );

  const progress = data.progress?.completion_percentage || 0;
  const statusColor = statusColors[data.status] || '#6366f1';

  const quickLinks = [
    { icon: Kanban, label: 'Kanban Board', to: `/projects/${projectId}/board`, color: '#6366f1', desc: 'View and manage tasks' },
    { icon: Zap, label: 'Sprint Planner', to: `/projects/${projectId}/sprints`, color: '#8b5cf6', desc: 'Plan your sprints' },
    { icon: Users, label: 'Team', to: `/projects/${projectId}/team`, color: '#06b6d4', desc: 'Manage team members' },
    { icon: BarChart3, label: 'Analytics', to: `/projects/${projectId}/analytics`, color: '#10b981', desc: 'View insights & charts' },
    { icon: Bot, label: 'AI Assistant', to: `/projects/${projectId}/ai`, color: '#f59e0b', desc: 'Get AI help' },
    { icon: FileText, label: 'Documents', to: `/projects/${projectId}/docs`, color: '#ef4444', desc: 'Auto-generated docs' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Breadcrumb */}
      <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
        <ArrowLeft size={14} /> Back to Projects
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: `linear-gradient(135deg, ${statusColor}15, rgba(255,255,255,0.02))`, border: `1px solid ${statusColor}25`, borderRadius: 24, padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: `${statusColor}1a`, border: `1px solid ${statusColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              {data.icon || '📁'}
            </div>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{data.name}</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 10, maxWidth: 600 }}>{data.description || data.short_description || 'No description'}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 12px', borderRadius: 99, background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}30`, textTransform: 'capitalize' }}>
                  {data.status}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Category:</span> {data.category}
                </span>
                {data.deadline && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} /> Due {format(new Date(data.deadline), 'MMM d, yyyy')}
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={11} /> {data.members?.length || 1} members
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={openEditModal} className="btn btn-secondary btn-sm" style={{ color: '#8b5cf6', gap: 6 }}>
              <Edit size={13} /> Edit Project
            </button>
            <button onClick={() => deleteMutation.mutate()} className="btn btn-secondary btn-sm" style={{ color: '#ef4444', gap: 6 }}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Overall Progress</span>
            <span style={{ fontSize: '0.85rem', color: statusColor, fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-glass-hover)', borderRadius: 99 }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, delay: 0.3 }}
              style={{ height: '100%', background: `linear-gradient(90deg, ${statusColor}, ${statusColor}99)`, borderRadius: 99, boxShadow: `0 0 10px ${statusColor}66` }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stats?.by_status?.completed?.count || 0} of {stats?.total || 0} tasks completed</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{data.progress?.total_tasks - data.progress?.completed_tasks || 0} remaining</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {[
            { label: 'Total Tasks', value: stats.total || 0, icon: Target, color: '#6366f1' },
            { label: 'In Progress', value: stats.by_status?.in_progress?.count || 0, icon: Clock, color: '#3b82f6' },
            { label: 'Completed', value: stats.by_status?.completed?.count || 0, icon: CheckCircle2, color: '#10b981' },
            { label: 'Completion', value: `${stats.completion_rate || 0}%`, icon: TrendingUp, color: '#f59e0b' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${stat.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Navigation */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Project Modules</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {quickLinks.map((link, i) => (
            <motion.div key={link.to} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link to={link.to} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                background: 'var(--bg-glass)', border: '1px solid var(--border-color)',
                borderRadius: 14, textDecoration: 'none', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = `${link.color}12`; e.currentTarget.style.borderColor = `${link.color}30`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${link.color}1a`, border: `1px solid ${link.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <link.icon size={18} style={{ color: link.color }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{link.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{link.desc}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Milestones & Tech Stack */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Milestones */}
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 18, padding: 24 }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, fontSize: '0.95rem' }}>Milestones</h3>
          {data.milestones?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-glass)', borderRadius: 10 }}>
                  <CheckCircle2 size={16} style={{ color: m.is_completed ? '#10b981' : '#475569', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: m.is_completed ? '#64748b' : '#f8fafc', textDecoration: m.is_completed ? 'line-through' : 'none' }}>{m.title}</div>
                    {m.due_date && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{format(new Date(m.due_date), 'MMM d, yyyy')}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No milestones defined</p>}
        </div>

        {/* Tech Stack */}
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 18, padding: 24 }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, fontSize: '0.95rem' }}>Tech Stack</h3>
          {data.tech_stack?.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.tech_stack.map(tech => (
                <span key={tech} style={{ padding: '5px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: '0.8rem', color: '#818cf8', fontWeight: 500 }}>
                  {tech}
                </span>
              ))}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tech stack defined</p>}
          {data.repository_url && (
            <a href={data.repository_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
              <GitBranch size={13} /> {data.repository_url}
            </a>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 18, padding: 24 }}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} style={{ color: '#6366f1' }} /> Recent Activity
        </h3>
        {activityLogs && activityLogs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
            {activityLogs.map((log) => (
              <div key={log._id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={14} style={{ color: '#818cf8' }} />
                </div>
                <div style={{ flex: 1, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {log.action}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activity recorded yet.</p>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 32, width: 420 }}>
            <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Edit Project</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Project Name</label>
              <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="input" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Description</label>
              <textarea rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="input" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Category</label>
              <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="input">
                <option value="web">Web Development</option>
                <option value="mobile">Mobile App</option>
                <option value="api">API Services</option>
                <option value="ml_ai">Machine Learning / AI</option>
                <option value="devops">DevOps</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Status</label>
              <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="input">
                <option value="planning">Planning</option>
                <option value="development">Development</option>
                <option value="testing">Testing</option>
                <option value="deployment">Deployment</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => editMutation.mutate(editForm)} disabled={editMutation.isPending}
                style={{ flex: 1, padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setShowEditModal(false)}
                style={{ padding: '10px 20px', background: 'var(--bg-glass-hover)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
