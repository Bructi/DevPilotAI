import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Moon, Plug, Save, Loader2, Unlink, ExternalLink, Monitor, LogOut } from 'lucide-react';

// GitHub icon SVG (not in this version of lucide-react)
const GithubIcon = ({ size = 16, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);
import { userAPI, authAPI } from '../services/api';
import { useAuthStore, useUIStore } from '../store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const JiraIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M16 2.5L2.5 16L16 29.5L29.5 16L16 2.5Z" fill="#2684FF"/>
    <path d="M16 9.5L9.5 16L16 22.5L22.5 16L16 9.5Z" fill="white"/>
  </svg>
);

const sections = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'security', icon: Lock, label: 'Security' },
  { id: 'sessions', icon: Monitor, label: 'Active Sessions' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'appearance', icon: Moon, label: 'Appearance' },
  { id: 'integrations', icon: Plug, label: 'Integrations' },
];

// Reusable Toggle
function Toggle({ checked, onChange }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer', flexShrink: 0 }}>
      <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} checked={checked} onChange={onChange} />
      <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: checked ? '#6366f1' : 'var(--bg-tertiary)', borderRadius: 24, transition: '0.3s', border: '1px solid var(--border-color)' }}>
        <span style={{ position: 'absolute', height: 18, width: 18, left: checked ? 22 : 3, bottom: 2, background: 'white', borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </span>
    </label>
  );
}

function SessionsSettings({ cardStyle }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => authAPI.getSessions().then(res => res.data)
  });

  const revoke = async (id) => {
    try {
      await authAPI.revokeSession(id);
      toast.success('Session revoked');
      queryClient.invalidateQueries(['sessions']);
    } catch (err) {
      toast.error('Failed to revoke session');
    }
  };

  if (isLoading) return <div style={{ padding: 20 }}><Loader2 className="animate-spin" /> Loading sessions...</div>;

  return (
    <div>
      <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 20 }}>Active Sessions</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>Review devices that are currently logged into your account.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data?.sessions?.map(s => (
          <div key={s.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                <Monitor size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.device_info || 'Unknown Device'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  IP: {s.ip_address} • Started {new Date(s.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <button onClick={() => revoke(s.id)} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} title="Revoke Session">
              <LogOut size={16} />
            </button>
          </div>
        ))}
        {data?.sessions?.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>No active sessions found.</div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const { user, setUser } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '', avatar: user?.avatar || '' });
  const [loading, setLoading] = useState(false);
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' });
  const [twoFactor, setTwoFactor] = useState(false);
  const [notifSettings, setNotifSettings] = useState({ email: true, push: true, weekly: false });

  // Integration states
  const [ghPat, setGhPat] = useState('');
  const [ghConnecting, setGhConnecting] = useState(false);
  const [jiraForm, setJiraForm] = useState({ jira_url: '', jira_email: '', jira_token: '' });
  const [jiraConnecting, setJiraConnecting] = useState(false);

  const { data: githubData, isLoading: ghLoading } = useQuery({
    queryKey: ['github-integration'],
    queryFn: () => userAPI.getGithubData().then(r => r.data),
  });

  const { data: jiraData, isLoading: jiraLoading } = useQuery({
    queryKey: ['jira-integration'],
    queryFn: () => userAPI.getJiraData().then(r => r.data),
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, avatar: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const res = await userAPI.updateProfile(form);
      setUser(res.data.user);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally { setLoading(false); }
  };

  const connectGithub = async () => {
    if (!ghPat.trim()) return toast.error('Please enter your GitHub PAT');
    setGhConnecting(true);
    try {
      const { data } = await userAPI.connectGithub(ghPat.trim());
      setUser(data.user);
      queryClient.invalidateQueries(['github-integration']);
      setGhPat('');
      toast.success(`Connected as @${data.github_data.username}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid GitHub token');
    } finally { setGhConnecting(false); }
  };

  const disconnectGithub = async () => {
    try {
      const { data } = await userAPI.disconnectGithub();
      setUser(data.user);
      queryClient.invalidateQueries(['github-integration']);
      toast.success('GitHub disconnected');
    } catch { toast.error('Failed to disconnect'); }
  };

  const connectJira = async () => {
    if (!jiraForm.jira_url || !jiraForm.jira_email || !jiraForm.jira_token) return toast.error('All fields required');
    setJiraConnecting(true);
    try {
      const { data } = await userAPI.connectJira(jiraForm);
      setUser(data.user);
      queryClient.invalidateQueries(['jira-integration']);
      setJiraForm({ jira_url: '', jira_email: '', jira_token: '' });
      toast.success(`Connected as ${data.jira_data.display_name}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid Jira credentials');
    } finally { setJiraConnecting(false); }
  };

  const disconnectJira = async () => {
    try {
      const { data } = await userAPI.disconnectJira();
      setUser(data.user);
      queryClient.invalidateQueries(['jira-integration']);
      toast.success('Jira disconnected');
    } catch { toast.error('Failed to disconnect'); }
  };

  const cardStyle = {
    background: 'var(--bg-glass)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    padding: '16px 20px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage your account preferences</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24 }}>
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeSection === s.id ? 'rgba(99,102,241,0.12)' : 'transparent', color: activeSection === s.id ? '#818cf8' : 'var(--text-secondary)', fontWeight: activeSection === s.id ? 600 : 400, fontSize: '0.875rem', transition: 'all 0.15s', textAlign: 'left' }}>
              <s.icon size={16} /> {s.label}
            </button>
          ))}
        </div>

        {/* Content Panel */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 18, padding: 28 }}>

          {/* ── Profile ── */}
          {activeSection === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 4 }}>Profile Information</h2>
              <div>
                <label className="label">Profile Picture</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: 'white', fontWeight: 700 }}>
                      {form.avatar && form.avatar.length > 500
                        ? <img src={form.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                        : (user?.name?.[0]?.toUpperCase() || 'U')}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="file" accept="image/*" className="input" onChange={handleAvatarChange} style={{ padding: '7px 14px' }} />
                    {form.avatar && form.avatar !== user?.avatar && (
                      <button onClick={() => setForm(p => ({ ...p, avatar: user?.avatar || '' }))} className="btn btn-ghost btn-sm" style={{ marginTop: 8, color: '#ef4444', padding: '4px 10px' }}>Remove</button>
                    )}
                  </div>
                </div>
              </div>
              <div><label className="label">Full Name</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">Bio</label><textarea className="input" rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." style={{ resize: 'vertical' }} /></div>
              <div style={{ marginTop: 4 }}>
                <button onClick={saveProfile} disabled={loading} className="btn btn-primary">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Save Changes</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Appearance ── */}
          {activeSection === 'appearance' && (
            <div>
              <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 20 }}>Appearance</h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { value: 'dark', label: '🌙 Dark', desc: 'Easy on the eyes' },
                  { value: 'light', label: '☀️ Light', desc: 'Clean & bright' },
                  { value: 'amoled', label: '📱 AMOLED', desc: 'Pure black' },
                ].map(t => (
                  <button key={t.value} onClick={() => setTheme(t.value)} style={{
                    padding: '14px 20px', borderRadius: 12, cursor: 'pointer',
                    background: theme === t.value ? 'rgba(99,102,241,0.12)' : 'var(--bg-glass)',
                    border: theme === t.value ? '2px solid #6366f1' : '1px solid var(--border-color)',
                    color: theme === t.value ? '#818cf8' : 'var(--text-secondary)',
                    fontWeight: theme === t.value ? 700 : 400, fontSize: '0.9rem', transition: 'all 0.2s',
                    textAlign: 'left',
                  }}>
                    <div>{t.label}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--text-muted)' }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Security ── */}
          {activeSection === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 16 }}>Change Password</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div><label className="label">Current Password</label><input type="password" className="input" value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} /></div>
                  <div><label className="label">New Password</label><input type="password" className="input" value={pwd.new} onChange={e => setPwd(p => ({ ...p, new: e.target.value }))} /></div>
                  <div><label className="label">Confirm New Password</label><input type="password" className="input" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} /></div>
                  <div style={{ marginTop: 4 }}>
                    <button onClick={() => { if (pwd.new !== pwd.confirm) return toast.error('Passwords do not match'); toast.success('Password updated!'); setPwd({ current: '', new: '', confirm: '' }); }} disabled={!pwd.current || !pwd.new || !pwd.confirm} className="btn btn-primary">
                      <Lock size={14} /> Update Password
                    </button>
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div>
                <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 16 }}>Two-Factor Authentication</h2>
                <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Require 2FA on Login</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Add an extra layer of security using an authenticator app.</div>
                  </div>
                  <Toggle checked={twoFactor} onChange={e => setTwoFactor(e.target.checked)} />
                </div>
              </div>
            </div>
          )}

          {/* ── Sessions ── */}
          {activeSection === 'sessions' && (
            <SessionsSettings cardStyle={cardStyle} />
          )}

          {/* ── Notifications ── */}
          {activeSection === 'notifications' && (
            <div>
              <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 20 }}>Notification Preferences</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { id: 'email', label: 'Email Notifications', desc: 'Receive daily digests and important updates via email.' },
                  { id: 'push', label: 'Push Notifications', desc: 'Get real-time alerts in your browser.' },
                  { id: 'weekly', label: 'Weekly Report', desc: 'A summary of your project activity every Monday.' },
                ].map(n => (
                  <div key={n.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{n.label}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{n.desc}</div>
                    </div>
                    <Toggle checked={notifSettings[n.id]} onChange={e => setNotifSettings(p => ({ ...p, [n.id]: e.target.checked }))} />
                  </div>
                ))}
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => toast.success('Preferences saved!')} className="btn btn-primary"><Save size={14} /> Save Preferences</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Integrations ── */}
          {activeSection === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 4 }}>Connected Integrations</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Link your external accounts to pull live data into DevPilot AI.</p>
              </div>

              {/* GitHub */}
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: githubData?.connected ? 'rgba(36,41,47,0.1)' : 'var(--bg-glass)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <GithubIcon size={20} style={{ color: githubData?.connected ? '#24292f' : 'var(--text-muted)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>GitHub</div>
                      <div style={{ fontSize: '0.8rem', color: githubData?.connected ? '#10b981' : 'var(--text-muted)' }}>
                        {ghLoading ? 'Checking...' : githubData?.connected ? `Connected as @${githubData.data.username}` : 'Not connected'}
                      </div>
                    </div>
                  </div>
                  {githubData?.connected && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={githubData.data.html_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                        <ExternalLink size={12} /> View Profile
                      </a>
                      <button onClick={disconnectGithub} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}>
                        <Unlink size={12} /> Disconnect
                      </button>
                    </div>
                  )}
                </div>

                {!githubData?.connected && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label className="label">GitHub Personal Access Token</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="input"
                        type="password"
                        value={ghPat}
                        onChange={e => setGhPat(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                      />
                      <button onClick={connectGithub} disabled={ghConnecting || !ghPat} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                        {ghConnecting ? <Loader2 size={14} className="animate-spin" /> : <><GithubIcon size={14} /> Connect</>}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Generate at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>GitHub Settings → Tokens</a>. Requires <code>read:user</code> scope.
                    </p>
                  </div>
                )}
              </div>

              {/* Jira */}
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: jiraData?.connected ? 'rgba(38,132,255,0.1)' : 'var(--bg-glass)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <JiraIcon size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Jira</div>
                      <div style={{ fontSize: '0.8rem', color: jiraData?.connected ? '#10b981' : 'var(--text-muted)' }}>
                        {jiraLoading ? 'Checking...' : jiraData?.connected ? `Connected as ${jiraData.data.display_name}` : 'Not connected'}
                      </div>
                    </div>
                  </div>
                  {jiraData?.connected && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a href={jiraData.data.base_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                        <ExternalLink size={12} /> Open Jira
                      </a>
                      <button onClick={disconnectJira} className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}>
                        <Unlink size={12} /> Disconnect
                      </button>
                    </div>
                  )}
                </div>

                {!jiraData?.connected && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div><label className="label">Jira Cloud URL</label>
                      <input className="input" value={jiraForm.jira_url} onChange={e => setJiraForm({ ...jiraForm, jira_url: e.target.value })} placeholder="https://yourcompany.atlassian.net" />
                    </div>
                    <div><label className="label">Email</label>
                      <input className="input" value={jiraForm.jira_email} onChange={e => setJiraForm({ ...jiraForm, jira_email: e.target.value })} placeholder="your@email.com" />
                    </div>
                    <div><label className="label">API Token</label>
                      <input className="input" type="password" value={jiraForm.jira_token} onChange={e => setJiraForm({ ...jiraForm, jira_token: e.target.value })} placeholder="Your Jira API token" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={connectJira} disabled={jiraConnecting} className="btn btn-primary">
                        {jiraConnecting ? <Loader2 size={14} className="animate-spin" /> : <><JiraIcon size={14} /> Connect Jira</>}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Generate at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#2684FF' }}>Atlassian Account Security</a>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
