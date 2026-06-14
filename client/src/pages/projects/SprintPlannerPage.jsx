import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Zap, Plus, Calendar, Target, CheckCircle2, PlayCircle, XCircle, Sparkles, Loader2, X, ExternalLink } from 'lucide-react';
import { sprintAPI } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useProjectStore } from '../../store';

const statusColors = { planned: '#6366f1', active: '#10b981', completed: '#94a3b8', cancelled: '#ef4444' };

export default function SprintPlannerPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => sprintAPI.getAll(projectId).then(r => r.data.sprints),
  });

  const createMutation = useMutation({
    mutationFn: (d) => sprintAPI.create(projectId, d),
    onSuccess: () => { toast.success('Sprint created!'); queryClient.invalidateQueries(['sprints', projectId]); setShowCreate(false); },
    onError: () => toast.error('Failed to create sprint'),
  });

  const [form, setForm] = useState({ name: '', goal: '', start_date: '', end_date: '' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Sprint Planner</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Plan and track your development sprints</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" style={{ gap: 6 }} onClick={() => navigate(`/projects/${projectId}/ai`)}><Sparkles size={13} /> AI Plan Sprint</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)} style={{ gap: 6 }}><Plus size={14} /> New Sprint</button>
        </div>
      </div>

      {/* AI Banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={22} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>AI Sprint Planner</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Let AI analyze your backlog and automatically create an optimized sprint with balanced workloads, realistic deadlines, and risk warnings.</p>
        </div>
        <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={() => navigate(`/projects/${projectId}/ai`)}><Zap size={14} /> Generate Sprint</button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={28} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} /></div>
      ) : data?.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <Zap size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>No sprints yet</h3>
          <p style={{ marginBottom: 20, fontSize: '0.9rem' }}>Create your first sprint to start organizing your work</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14} /> Create First Sprint</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data?.map((sprint, i) => (
            <motion.div key={sprint._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <SprintCard sprint={sprint} />
            </motion.div>
          ))}
        </div>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Create Sprint</h3>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="label">Sprint Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Sprint 1" /></div>
              <div><label className="label">Sprint Goal</label><textarea className="input" rows={2} value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} placeholder="What do you aim to achieve?" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Start Date</label><input type="date" className="input" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
                <div><label className="label">End Date</label><input type="date" className="input" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name || !form.start_date || !form.end_date} className="btn btn-primary">
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Create Sprint</>}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SprintCard({ sprint }) {
  const color = statusColors[sprint.status] || '#6366f1';
  const progress = sprint.total_story_points > 0 ? Math.round(sprint.completed_story_points / sprint.total_story_points * 100) : 0;
  return (
    <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{sprint.name}</h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: 99, background: `${color}20`, color, textTransform: 'capitalize' }}>{sprint.status}</span>
          </div>
          {sprint.goal && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sprint.goal}</p>}
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {sprint.start_date ? format(new Date(sprint.start_date), 'MMM d') : '–'} → {sprint.end_date ? format(new Date(sprint.end_date), 'MMM d') : '–'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 5, background: 'var(--bg-glass-hover)', borderRadius: 99 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: color, borderRadius: 99 }} />
        </div>
        <span style={{ fontSize: '0.75rem', color, fontWeight: 600 }}>{progress}%</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sprint.completed_story_points || 0}/{sprint.total_story_points || 0} pts</span>
      </div>
    </div>
  );
}
