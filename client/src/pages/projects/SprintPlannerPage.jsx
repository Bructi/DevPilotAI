import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Calendar, Target, CheckCircle2, PlayCircle, XCircle, Sparkles, Loader2, X, ExternalLink, RefreshCw } from 'lucide-react';
import { sprintAPI, aiAPI } from '../../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
              <SprintCard sprint={sprint} projectId={projectId} />
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

function SprintCard({ sprint, projectId }) {
  const queryClient = useQueryClient();
  const [showRetro, setShowRetro] = useState(false);

  const startMutation = useMutation({
    mutationFn: () => sprintAPI.start(projectId, sprint._id),
    onSuccess: () => { toast.success('Sprint started'); queryClient.invalidateQueries(['sprints', projectId]); },
    onError: () => toast.error('Failed to start sprint')
  });

  const completeMutation = useMutation({
    mutationFn: () => sprintAPI.complete(projectId, sprint._id),
    onSuccess: () => { toast.success('Sprint completed'); queryClient.invalidateQueries(['sprints', projectId]); },
    onError: () => toast.error('Failed to complete sprint')
  });

  const estimateMutation = useMutation({
    mutationFn: () => sprintAPI.estimateTasks(projectId, sprint._id),
    onSuccess: () => { toast.success('Tasks estimated'); queryClient.invalidateQueries(['sprints', projectId]); },
    onError: () => toast.error('Estimation failed')
  });

  const color = statusColors[sprint.status] || '#6366f1';
  const progress = sprint.total_story_points > 0 ? Math.round(sprint.completed_story_points / sprint.total_story_points * 100) : 0;
  
  return (
    <>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 5, background: 'var(--bg-glass-hover)', borderRadius: 99 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: color, borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: '0.75rem', color, fontWeight: 600 }}>{progress}%</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sprint.completed_story_points || 0}/{sprint.total_story_points || 0} pts</span>
        </div>
        
        <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          {sprint.status === 'planned' && (
            <>
              <button onClick={() => estimateMutation.mutate()} disabled={estimateMutation.isPending} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
                {estimateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} AI Estimate Tasks
              </button>
              <button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
                {startMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={13} />} Start Sprint
              </button>
            </>
          )}
          {sprint.status === 'active' && (
            <button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending} className="btn btn-primary btn-sm" style={{ gap: 6, background: '#10b981', color: 'white', borderColor: '#10b981' }}>
              {completeMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Complete Sprint
            </button>
          )}
          {sprint.status === 'completed' && (
            <button onClick={() => setShowRetro(true)} className="btn btn-secondary btn-sm" style={{ gap: 6, color: '#8b5cf6', borderColor: '#8b5cf6' }}>
              <RefreshCw size={13} /> AI Retrospective
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showRetro && (
          <SprintRetrospectiveModal sprint={sprint} projectId={projectId} onClose={() => setShowRetro(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Sprint Retrospective Modal ───────────────────────────────────────────────
function SprintRetrospectiveModal({ sprint, projectId, onClose }) {
  const [retroData, setRetroData] = useState(null);

  const retroMutation = useMutation({
    mutationFn: () => aiAPI.sprintRetrospective({ sprintId: sprint._id }),
    onSuccess: (res) => setRetroData(res.data.retrospective),
    onError: () => toast.error('Failed to generate retrospective')
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 700, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#8b5cf6" /> Sprint Retrospective: {sprint.name}
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {!retroData ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 16 }}>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Let DevPilot AI analyze your sprint's performance, what went well, and what could be improved.</p>
            <button onClick={() => retroMutation.mutate()} disabled={retroMutation.isPending} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}>
              {retroMutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Analyzing Sprint...</> : <><Sparkles size={16} /> Generate Retrospective</>}
            </button>
          </div>
        ) : (
          <div className="md-content" style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{retroData}</ReactMarkdown>
          </div>
        )}
      </motion.div>
    </div>
  );
}
