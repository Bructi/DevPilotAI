import React, { useState, useRef } from 'react';
import { useAuthStore } from '../store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  User, Mail, GitBranch, Calendar, Edit2, Save, X, Camera,
  Star, GitFork, ExternalLink, Users, BookOpen,
  Loader2, CheckCircle2, AlertCircle, Unlink, RefreshCw,
} from 'lucide-react';

// GitHub icon SVG (not in this version of lucide-react)
const GithubIcon = ({ size = 16, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);
import { format } from 'date-fns';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

// ─── Jira Icon (SVG) ───────────────────────────────────────────────────────
const JiraIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M16 2.5L2.5 16L16 29.5L29.5 16L16 2.5Z" fill="#2684FF"/>
    <path d="M16 9.5L9.5 16L16 22.5L22.5 16L16 9.5Z" fill="white"/>
  </svg>
);

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
  });

  // GitHub integration state
  const [ghPat, setGhPat] = useState('');
  const [showGhInput, setShowGhInput] = useState(false);

  // Jira integration state
  const [jiraForm, setJiraForm] = useState({ jira_url: '', jira_email: '', jira_token: '' });
  const [showJiraInput, setShowJiraInput] = useState(false);

  // Fetch GitHub data
  const { data: githubData, isLoading: ghLoading, refetch: refetchGh } = useQuery({
    queryKey: ['github-integration'],
    queryFn: () => userAPI.getGithubData().then(r => r.data),
  });

  // Fetch Jira data
  const { data: jiraData, isLoading: jiraLoading, refetch: refetchJira } = useQuery({
    queryKey: ['jira-integration'],
    queryFn: () => userAPI.getJiraData().then(r => r.data),
  });

  // Fetch GitHub repos (when connected)
  const { data: reposData } = useQuery({
    queryKey: ['github-repos'],
    queryFn: () => userAPI.getGithubRepos().then(r => r.data),
    enabled: !!githubData?.connected,
  });

  // Fetch Jira projects (when connected)
  const { data: jiraProjectsData } = useQuery({
    queryKey: ['jira-projects'],
    queryFn: () => userAPI.getJiraProjects().then(r => r.data),
    enabled: !!jiraData?.connected,
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData };
      if (avatarPreview) payload.avatar = avatarPreview;
      const { data } = await userAPI.updateProfile(payload);
      setUser(data.user);
      setIsEditing(false);
      setAvatarPreview(null);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAvatarPreview(null);
    setFormData({ name: user?.name || '', bio: user?.bio || '' });
  };

  const connectGithub = async () => {
    if (!ghPat.trim()) return toast.error('Please enter your GitHub token');
    try {
      const { data } = await userAPI.connectGithub(ghPat.trim());
      setUser(data.user);
      queryClient.invalidateQueries(['github-integration']);
      queryClient.invalidateQueries(['github-repos']);
      setGhPat('');
      setShowGhInput(false);
      toast.success(`Connected as @${data.github_data.username}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to connect GitHub');
    }
  };

  const disconnectGithub = async () => {
    try {
      const { data } = await userAPI.disconnectGithub();
      setUser(data.user);
      queryClient.invalidateQueries(['github-integration']);
      queryClient.invalidateQueries(['github-repos']);
      toast.success('GitHub disconnected');
    } catch { toast.error('Failed to disconnect'); }
  };

  const connectJira = async () => {
    if (!jiraForm.jira_url || !jiraForm.jira_email || !jiraForm.jira_token)
      return toast.error('All Jira fields are required');
    try {
      const { data } = await userAPI.connectJira(jiraForm);
      setUser(data.user);
      queryClient.invalidateQueries(['jira-integration']);
      queryClient.invalidateQueries(['jira-projects']);
      setJiraForm({ jira_url: '', jira_email: '', jira_token: '' });
      setShowJiraInput(false);
      toast.success(`Connected as ${data.jira_data.display_name}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to connect Jira');
    }
  };

  const disconnectJira = async () => {
    try {
      const { data } = await userAPI.disconnectJira();
      setUser(data.user);
      queryClient.invalidateQueries(['jira-integration']);
      queryClient.invalidateQueries(['jira-projects']);
      toast.success('Jira disconnected');
    } catch { toast.error('Failed to disconnect'); }
  };

  const displayAvatar = avatarPreview || user?.avatar;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>

      {/* ─── Hero Card ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 32, position: 'relative', overflow: 'hidden' }}>
        {/* gradient accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginTop: 8 }}>
          {/* Avatar with upload overlay */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.5)',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.2rem', fontWeight: 800, color: 'white',
              overflow: 'hidden', position: 'relative',
            }}>
              {displayAvatar && displayAvatar.length > 500
                ? <img src={displayAvatar} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={(e) => e.target.style.display = 'none'} />
                : (user?.name?.[0]?.toUpperCase() || 'U')}

              {/* Hover overlay for upload */}
              {isEditing && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', borderRadius: '50%', gap: 4,
                  }}>
                  <Camera size={20} color="white" />
                  <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 600 }}>CHANGE</span>
                </div>
              )}
            </div>
            {avatarPreview && (
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)' }}>
                <CheckCircle2 size={12} color="white" />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>

          {/* User info */}
          <div style={{ flex: 1, minWidth: 220 }}>
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
                <input
                  className="input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your Name"
                  style={{ fontSize: '1.1rem', fontWeight: 700 }}
                />
                <textarea
                  className="input"
                  rows={2}
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Software Developer · Tell us about yourself..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            ) : (
              <>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{user?.name}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: 12 }}>{user?.bio || 'Software Developer'}</p>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Mail size={14} /> {user?.email}
                  </span>
                  {user?.github_username && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <GithubIcon size={14} /> @{user.github_username}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Calendar size={14} /> Joined {user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : '—'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Edit / Save actions */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="btn btn-secondary btn-sm">
                <Edit2 size={14} /> Edit Profile
              </button>
            ) : (
              <>
                <button onClick={handleCancel} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
                  <X size={14} /> Cancel
                </button>
                <button onClick={handleSave} className="btn btn-primary btn-sm">
                  <Save size={14} /> Save
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Integrations Grid ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>

        {/* ── GitHub Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: githubData?.connected ? 'rgba(36,41,47,0.15)' : 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                  <GithubIcon size={18} style={{ color: githubData?.connected ? '#24292f' : 'var(--text-muted)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>GitHub</div>
                  <div style={{ fontSize: '0.75rem', color: githubData?.connected ? '#10b981' : 'var(--text-muted)' }}>
                    {ghLoading ? 'Checking...' : githubData?.connected ? '● Connected' : '○ Not connected'}
                  </div>
                </div>
              </div>
              {githubData?.connected && (
                <button onClick={disconnectGithub} className="btn btn-ghost btn-sm" style={{ color: '#ef4444', fontSize: '0.78rem' }}>
                  <Unlink size={12} /> Disconnect
                </button>
              )}
            </div>

            {githubData?.connected ? (
              <>
                {/* GitHub Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 14px', background: 'var(--bg-glass)', borderRadius: 12 }}>
                  <img src={githubData.data.avatar} alt={githubData.data.username} style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{githubData.data.display_name}</div>
                    <a href={githubData.data.html_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      @{githubData.data.username} <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Repos', value: githubData.data.public_repos, icon: BookOpen, color: '#6366f1' },
                    { label: 'Followers', value: githubData.data.followers, icon: Users, color: '#8b5cf6' },
                    { label: 'Following', value: githubData.data.following, icon: Users, color: '#06b6d4' },
                  ].map(stat => (
                    <div key={stat.label} style={{ padding: '10px 12px', background: 'var(--bg-glass)', borderRadius: 10, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
                {/* Recent Repos */}
                {reposData?.repos?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Repos</div>
                    {reposData.repos.slice(0, 3).map(repo => (
                      <a key={repo.id} href={repo.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 8, textDecoration: 'none', border: '1px solid var(--border-color)', transition: 'all 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <GitBranch size={12} style={{ color: '#6366f1', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.name}</span>
                        {repo.language && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>{repo.language}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          <Star size={10} />{repo.stars}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 14, lineHeight: 1.5 }}>
                  Connect your GitHub account to display your repos, stats, and activity inside DevPilot.
                </p>
                {showGhInput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      className="input"
                      type="password"
                      value={ghPat}
                      onChange={e => setGhPat(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setShowGhInput(false)} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                      <button onClick={connectGithub} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                        <GithubIcon size={13} /> Connect GitHub
                      </button>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Generate a token at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>GitHub Settings → Developer settings → Personal access tokens</a>. Needs <code>read:user</code> scope.
                    </p>
                  </div>
                ) : (
                  <button onClick={() => setShowGhInput(true)} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    <GithubIcon size={14} /> Connect GitHub
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* ── Jira Card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: jiraData?.connected ? 'rgba(38,132,255,0.12)' : 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                  <JiraIcon size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Jira</div>
                  <div style={{ fontSize: '0.75rem', color: jiraData?.connected ? '#10b981' : 'var(--text-muted)' }}>
                    {jiraLoading ? 'Checking...' : jiraData?.connected ? '● Connected' : '○ Not connected'}
                  </div>
                </div>
              </div>
              {jiraData?.connected && (
                <button onClick={disconnectJira} className="btn btn-ghost btn-sm" style={{ color: '#ef4444', fontSize: '0.78rem' }}>
                  <Unlink size={12} /> Disconnect
                </button>
              )}
            </div>

            {jiraData?.connected ? (
              <>
                {/* Jira Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 14px', background: 'var(--bg-glass)', borderRadius: 12 }}>
                  {jiraData.data.avatar
                    ? <img src={jiraData.data.avatar} alt={jiraData.data.display_name} style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid rgba(38,132,255,0.3)' }} />
                    : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #2684FF, #0052CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: 'white', fontWeight: 700 }}>{jiraData.data.display_name?.[0]}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{jiraData.data.display_name}</div>
                    <a href={jiraData.data.base_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2684FF', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {jiraData.data.base_url?.replace('https://', '')} <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
                {/* Jira Projects */}
                {jiraProjectsData?.projects?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Projects</div>
                    {jiraProjectsData.projects.slice(0, 4).map(proj => (
                      <div key={proj.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        {proj.avatar
                          ? <img src={proj.avatar} alt={proj.key} style={{ width: 20, height: 20, borderRadius: 4 }} />
                          : <div style={{ width: 20, height: 20, borderRadius: 4, background: 'linear-gradient(135deg, #2684FF, #0052CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white', fontWeight: 700 }}>{proj.key?.[0]}</div>
                        }
                        <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>{proj.key}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 14, lineHeight: 1.5 }}>
                  Connect Jira to view your projects and issues directly in DevPilot AI.
                </p>
                {showJiraInput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      className="input"
                      value={jiraForm.jira_url}
                      onChange={e => setJiraForm({ ...jiraForm, jira_url: e.target.value })}
                      placeholder="https://yourcompany.atlassian.net"
                    />
                    <input
                      className="input"
                      value={jiraForm.jira_email}
                      onChange={e => setJiraForm({ ...jiraForm, jira_email: e.target.value })}
                      placeholder="your@email.com"
                    />
                    <input
                      className="input"
                      type="password"
                      value={jiraForm.jira_token}
                      onChange={e => setJiraForm({ ...jiraForm, jira_token: e.target.value })}
                      placeholder="Jira API Token"
                      style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setShowJiraInput(false)} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                      <button onClick={connectJira} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                        <JiraIcon size={13} /> Connect Jira
                      </button>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Generate your API token at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#2684FF' }}>Atlassian Account Security</a>.
                    </p>
                  </div>
                ) : (
                  <button onClick={() => setShowJiraInput(true)} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                    <JiraIcon size={14} /> Connect Jira
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
