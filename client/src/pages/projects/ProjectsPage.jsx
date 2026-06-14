import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Filter, Grid3X3, List, FolderKanban, Calendar,
  Users, TrendingUp, MoreVertical, Edit, Trash2, X, Loader2,
  Globe, Code2, Smartphone, Database, Cpu, GitBranch,
} from 'lucide-react';
import { projectAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';

const categoryIcons = {
  web: Globe, mobile: Smartphone, api: Code2, ml_ai: Cpu,
  data: Database, devops: GitBranch, desktop: FolderKanban, other: FolderKanban,
};
const statusColors = {
  planning: '#6366f1', development: '#3b82f6', testing: '#f59e0b',
  deployment: '#10b981', maintenance: '#8b5cf6', completed: '#10b981', paused: '#94a3b8', cancelled: '#ef4444',
};
const statuses = ['planning', 'development', 'testing', 'deployment', 'maintenance', 'completed', 'paused'];
const categories = ['web', 'mobile', 'api', 'ml_ai', 'data', 'devops', 'desktop', 'other'];

export default function ProjectsPage() {
  const [params] = useSearchParams();
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(params.get('new') === 'true');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search, statusFilter],
    queryFn: () => projectAPI.getAll({ search: search || undefined, status: statusFilter || undefined }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: projectAPI.delete,
    onSuccess: () => { toast.success('Project deleted'); queryClient.invalidateQueries(['projects']); },
    onError: () => toast.error('Failed to delete project'),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Projects</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{data?.total || 0} projects · {data?.projects?.filter(p => p.status !== 'completed').length || 0} active</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ gap: 8 }}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filters bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..." style={{ paddingLeft: 36 }}
          />
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 3 }}>
          {[['grid', Grid3X3], ['list', List]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)} className="btn btn-ghost btn-icon" style={{ padding: 6, color: view === v ? '#818cf8' : 'var(--text-muted)', background: view === v ? 'rgba(99,102,241,0.15)' : 'transparent' }}>
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid/List */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr', gap: 16 }}>
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}
        </div>
      ) : data?.projects?.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <FolderKanban size={60} style={{ color: 'var(--border-color-light)', margin: '0 auto 16px' }} />
          <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>No projects found</h3>
          <p style={{ marginBottom: 24, fontSize: '0.9rem' }}>Create your first project to get started</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Create Project</button>
        </div>
      ) : (
        <motion.div layout style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr', gap: 16 }}>
          <AnimatePresence>
            {data?.projects?.map((project, i) => (
              <motion.div key={project._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}>
                <ProjectCard project={project} view={view} onDelete={() => deleteMutation.mutate(project._id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

function ProjectCard({ project, view, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusColor = statusColors[project.status] || '#6366f1';
  const progress = project.progress?.completion_percentage || 0;
  const CatIcon = categoryIcons[project.category] || FolderKanban;

  if (view === 'list') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 14, transition: 'all 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-glass)'}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${statusColor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
          {project.icon || '📁'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={`/projects/${project._id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.95rem' }}>{project.name}</Link>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.short_description || project.description || 'No description'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ height: 4, width: 80, background: 'var(--border-color)', borderRadius: 99 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: statusColor, borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, textAlign: 'center' }}>{progress}%</div>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor, textTransform: 'capitalize', minWidth: 80 }}>{project.status}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{format(new Date(project.updatedAt), 'MMM d')}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 18, overflow: 'hidden', transition: 'all 0.25s', position: 'relative' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-glass-hover)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-glass)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}    
    >
      {/* Color accent top bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${statusColor}, ${statusColor}66)` }} />

      <div style={{ padding: '20px' }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${statusColor}1a`, border: `1px solid ${statusColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              {project.icon || '📁'}
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{project.category}</div>
              <Link to={`/projects/${project._id}`} style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.95rem', display: 'block' }}>{project.name}</Link>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setMenuOpen(!menuOpen)} style={{ color: 'var(--text-muted)', padding: 4 }}>
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuOpen(false)} />
                <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 6, zIndex: 100, minWidth: 140, boxShadow: 'var(--shadow-md)' }}>
                  <Link to={`/projects/${project._id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>
                    <Edit size={13} /> Edit Project
                  </Link>
                  <button onClick={() => { onDelete(); setMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {project.short_description || project.description || 'No description provided.'}
        </p>

        {/* Tags */}
        {project.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {project.tags.slice(0, 3).map(tag => (
              <span key={tag} style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 99, color: '#818cf8' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Progress */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Progress</span>
            <span style={{ fontSize: '0.75rem', color: statusColor, fontWeight: 600 }}>{progress}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--border-color)', borderRadius: 99 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${statusColor}, ${statusColor}99)`, borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <Users size={12} /> {project.members?.length || 1}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <TrendingUp size={12} /> {project.progress?.total_tasks || 0} tasks
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30`, textTransform: 'capitalize' }}>
            {project.status}
          </span>
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: { status: 'planning', category: 'web', priority: 'medium', icon: '🚀' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const tech_stack = data.tech_stack ? data.tech_stack.split(',').map(t => t.trim()).filter(Boolean) : [];
      await projectAPI.create({ ...data, tags, tech_stack });
      toast.success('Project created! 🚀');
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['analytics-overview']);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const emojis = ['🚀', '💡', '⚡', '🎯', '🛡️', '🔥', '🌟', '💎', '🤖', '🎨', '📱', '🌐'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 24, padding: '32px', width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>Create New Project</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fill in the details to get started</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Icon picker */}
          <div>
            <label className="label">Project Icon</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {emojis.map(emoji => (
                <label key={emoji} style={{ cursor: 'pointer' }}>
                  <input type="radio" value={emoji} {...register('icon')} style={{ display: 'none' }} />
                  <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', background: watch('icon') === emoji ? 'rgba(99,102,241,0.2)' : 'var(--bg-glass)', border: watch('icon') === emoji ? '2px solid #6366f1' : '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {emoji}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Project Name *</label>
              <input className="input" placeholder="My Awesome Project" {...register('name', { required: 'Name required' })} />
              {errors.name && <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>{errors.name.message}</span>}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Short Description</label>
              <input className="input" placeholder="One line about your project..." {...register('short_description')} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('status')}>
                {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" {...register('category')}>
                {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" {...register('priority')}>
                {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" {...register('start_date')} />
            </div>
            <div>
              <label className="label">Deadline</label>
              <input type="date" className="input" {...register('deadline')} />
            </div>
            <div>
              <label className="label">Tags (comma-separated)</label>
              <input className="input" placeholder="react, nodejs, ai" {...register('tags')} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Tech Stack (comma-separated)</label>
              <input className="input" placeholder="React, Node.js, MongoDB, Docker" {...register('tech_stack')} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Description</label>
              <textarea className="input" rows={3} placeholder="Describe your project..." {...register('description')} style={{ resize: 'vertical' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ minWidth: 140 }}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Plus size={16} /> Create Project</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
