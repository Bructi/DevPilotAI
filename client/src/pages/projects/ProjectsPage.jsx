import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Grid3X3, List, FolderKanban, Calendar,
  Users, TrendingUp, MoreVertical, Edit, Trash2, X, Loader2,
  Globe, Code2, Smartphone, Database, Cpu, GitBranch, Star, GitFork, Lock, Unlock, ExternalLink,
} from 'lucide-react';

const GithubIcon = ({ size = 24, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a5.4 5.4 0 0 0-1.5-3.8 5.3 5.3 0 0 0 0-3.8s-1.2-.4-3.9 1.4a13.3 13.3 0 0 0-7 0C6.2 1.6 5 2 5 2a5.3 5.3 0 0 0 0 3.8A5.4 5.4 0 0 0 3.5 12c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4"></path>
    <path d="M9 18c-4.5 1.5-5-2.5-7-3"></path>
  </svg>
);

import { projectAPI, userAPI } from '../../services/api';
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
  const [showImportGitHub, setShowImportGitHub] = useState(false);
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowImportGitHub(true)}
            style={{ gap: 8, border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}
          >
            <GithubIcon size={15} /> Import from GitHub
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ gap: 8 }}>
            <Plus size={16} /> New Project
          </button>
        </div>
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

      {/* Import from GitHub Modal */}
      <AnimatePresence>
        {showImportGitHub && (
          <ImportFromGitHubModal
            onClose={() => setShowImportGitHub(false)}
            onImported={() => {
              queryClient.invalidateQueries(['projects']);
              setShowImportGitHub(false);
            }}
          />
        )}
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
// ─── Import from GitHub Modal ─────────────────────────────────────────────────
function ImportFromGitHubModal({ onClose, onImported }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(null); // full_name being imported

  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
    Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
    'C#': '#178600', Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
    HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Vue: '#41b883',
    default: '#6366f1',
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['github-repos'],
    queryFn: () => userAPI.getGithubRepos().then(r => r.data.repos),
    staleTime: 60000,
  });

  const filtered = (data || []).filter(r =>
    !search.trim() ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.language || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleImport = async (repo) => {
    setImporting(repo.full_name);
    try {
      const res = await projectAPI.importFromGitHub(repo.full_name);
      toast.success(`🚀 "${repo.name}" imported as a project!`);
      onImported();
      // Navigate to the new project
      navigate(`/projects/${res.data.project._id}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Import failed';
      if (err.response?.status === 409) {
        const pid = err.response.data.project_id;
        toast.error(msg);
        if (pid) navigate(`/projects/${pid}`);
        onClose();
      } else {
        toast.error(msg);
      }
    } finally {
      setImporting(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        style={{
          background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24, width: '100%', maxWidth: 720,
          maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #24292e, #444d56)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
                <GithubIcon size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.15rem', marginBottom: 2 }}>Import from GitHub</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {data ? `${data.length} repositories found` : 'Loading your repositories...'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, language, description..."
              autoFocus
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>

        {/* Repo list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 12 }} />)}
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ margin: '0 auto 12px', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <GithubIcon size={36} />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>GitHub not connected or failed to load repos.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>Connect GitHub in your Profile settings first.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>No repositories match "{search}"</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(repo => {
                const langColor = LANG_COLORS[repo.language] || LANG_COLORS.default;
                const isImporting = importing === repo.full_name;
                return (
                  <div key={repo.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                  >
                    {/* Icon */}
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {repo.is_private ? <Lock size={15} color="#f59e0b" /> : <Unlock size={15} color="var(--text-muted)" />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.name}</span>
                        {repo.is_fork && <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', color: '#818cf8', flexShrink: 0 }}>fork</span>}
                        {repo.is_private && <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', flexShrink: 0 }}>private</span>}
                      </div>
                      {repo.description && (
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{repo.description}</p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {repo.language && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: langColor, flexShrink: 0 }} />
                            {repo.language}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <Star size={10} /> {repo.stars}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <GitFork size={10} /> {repo.forks}
                        </span>
                        {repo.topics?.slice(0,3).map(t => (
                          <span key={t} style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{t}</span>
                        ))}
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {format(new Date(repo.updated_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <a href={repo.url} target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}
                        title="Open on GitHub"
                      >
                        <ExternalLink size={13} />
                      </a>
                      <button
                        onClick={() => handleImport(repo)}
                        disabled={!!importing}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 14px', borderRadius: 7, cursor: importing ? 'not-allowed' : 'pointer',
                          background: isImporting ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          border: 'none', color: '#fff', fontSize: '0.78rem', fontWeight: 600,
                          opacity: (importing && !isImporting) ? 0.5 : 1,
                          transition: 'all 0.15s',
                          boxShadow: isImporting ? 'none' : '0 2px 10px rgba(99,102,241,0.35)',
                        }}
                      >
                        {isImporting ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Importing…</> : <><Plus size={13} /> Import</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', flexShrink: 0 }}>
          Importing creates a project with auto-detected tech stack, category, and description from the repo metadata.
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    </motion.div>
  );
}
