import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Loader2, UserPlus, Settings, Activity, Shield, Trash2, Edit2, Search, ArrowRight, User, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamAPI, userAPI, aiAPI } from '../services/api';
import { connectSocket } from '../services/socket';
import { useAuthStore } from '../store';

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamAPI.getAll().then(res => res.data)
  });

  const teams = teamsData?.teams || [];
  
  // Set first team as selected by default if none selected
  React.useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const createTeamMutation = useMutation({
    mutationFn: (data) => teamAPI.create(data),
    onSuccess: (res) => {
      toast.success('Team created successfully!');
      setNewTeamName('');
      setNewTeamDesc('');
      setShowCreate(false);
      queryClient.invalidateQueries(['teams']);
      setSelectedTeamId(res.data.team.id);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create team');
    }
  });

  const handleCreateTeam = (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return toast.error('Team name is required');
    createTeamMutation.mutate({ name: newTeamName, description: newTeamDesc });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      
      {/* LEFT PANEL: Teams List */}
      <div style={{ width: 320, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>My Teams</h2>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm" style={{ padding: '6px 10px' }}>
            <Plus size={16} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {teams.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <Users size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No teams yet.</p>
            </div>
          ) : (
            teams.map(team => (
              <div 
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  marginBottom: 8,
                  background: selectedTeamId === team.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                  border: `1px solid ${selectedTeamId === team.id ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: selectedTeamId === team.id ? '#6366f1' : 'var(--text-primary)' }}>
                      {team.name}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {team.description || 'No description'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Team Workspace */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-default)' }}>
        {selectedTeam ? (
          <TeamWorkspace team={selectedTeam} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <Users size={64} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
            <h2 style={{ color: 'var(--text-secondary)' }}>Select or create a team to view its workspace.</h2>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 32, width: 420 }}>
            <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Create New Team</h3>
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Team Name</label>
                <input autoFocus value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="e.g. Frontend Ninjas" className="input" />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Description (optional)</label>
                <textarea value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} placeholder="What does this team do?" className="input" style={{ minHeight: 80, resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={createTeamMutation.isPending} className="btn btn-primary">
                  {createTeamMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import TeamWhiteboard from '../components/team/TeamWhiteboard';
import { PenTool } from 'lucide-react';

// ─── Team Workspace Subcomponent ─────────────────────────────────────────────
function TeamWorkspace({ team }) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'chat', label: 'Team Chat', icon: MessageSquare },
    { id: 'whiteboard', label: 'Whiteboard', icon: PenTool },
    { id: 'members', label: 'Members & Roles', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isWhiteboard = activeTab === 'whiteboard';

  return (
    <div style={{
      padding: isWhiteboard ? '0' : '32px 40px',
      maxWidth: isWhiteboard ? '100%' : 1000,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Header — hidden on whiteboard */}
      {!isWhiteboard && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', fontWeight: 800 }}>
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{team.name}</h1>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '1rem' }}>Team Workspace</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 24,
        borderBottom: '1px solid var(--border-color)',
        marginBottom: isWhiteboard ? 0 : 32,
        padding: isWhiteboard ? '0 20px' : '0',
        background: isWhiteboard ? 'var(--bg-card)' : 'transparent',
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 4px',
                background: 'none', border: 'none',
                color: isActive ? '#6366f1' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                borderBottom: `2px solid ${isActive ? '#6366f1' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: -1,
                fontSize: '0.88rem',
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        {activeTab === 'overview' && <TabOverview team={team} />}
        {activeTab === 'chat' && <TabChat team={team} />}
        {activeTab === 'whiteboard' && <TeamWhiteboard team={team} />}
        {activeTab === 'members' && <TabMembers team={team} />}
        {activeTab === 'settings' && <TabSettings team={team} />}
      </div>
    </div>
  );
}

// ─── Team Chat Tab ───────────────────────────────────────────────────────────
function TabChat({ team }) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();
  const chatEndRef = React.useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['team-chat', team.id],
    queryFn: () => teamAPI.getChat(team.id).then(r => r.data),
  });

  const messages = data?.messages || [];

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  React.useEffect(() => {
    if (!user) return;
    const socket = connectSocket(user.id, user.name);
    if (socket) {
      socket.emit('team:join', { teamId: team.id });
      
      const handleMessage = ({ message }) => {
        queryClient.setQueryData(['team-chat', team.id], (old) => {
          if (!old) return { messages: [message] };
          if (old.messages.some(m => m._id === message._id)) return old;
          return { messages: [...old.messages, message] };
        });
      };
      
      socket.on('chat:message', handleMessage);

      return () => {
        socket.emit('team:leave', { teamId: team.id });
        socket.off('chat:message', handleMessage);
      };
    }
  }, [team.id, user, queryClient]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      await teamAPI.sendMessage(team.id, { content, type: 'text' });
      setContent('');
      // We don't invalidate here, the socket event 'chat:message' will handle adding it instantly
    } catch(err) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <Loader2 className="animate-spin" />;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 250px)' }}>
      <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>
            <MessageSquare size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
            <p>No messages yet. Say hello to the team!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg._id} style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f122', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 'bold' }}>
                {msg.sender_name ? msg.sender_name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{msg.sender_name || 'Unknown User'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ background: 'var(--bg-default)', padding: '10px 14px', borderRadius: '0 12px 12px 12px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>
      
      <div style={{ padding: 20, borderTop: '1px solid var(--border-color)' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 12 }}>
          <input 
            value={content} 
            onChange={e => setContent(e.target.value)} 
            placeholder="Type a message..." 
            className="input" 
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={sending || !content.trim()} className="btn btn-primary">
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
function TabOverview({ team }) {
  const { data } = useQuery({
    queryKey: ['team-members', team.id],
    queryFn: () => teamAPI.getMembers(team.id).then(r => r.data)
  });
  
  const [aiPulse, setAiPulse] = useState('');
  const [pulseLoading, setPulseLoading] = useState(false);

  const generatePulse = async () => {
    setPulseLoading(true);
    try {
      const res = await aiAPI.chat([{
        role: 'user', 
        content: `Give a 2 sentence fun and encouraging "Team Pulse" for a team named "${team.name}" which has ${data?.members?.length || 0} members. Description: ${team.description || 'None'}.`
      }]);
      setAiPulse(res.data.content || res.data.reply);
    } catch(err) {
      toast.error('Failed to generate AI pulse');
    } finally {
      setPulseLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>About this team</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{team.description || 'No description provided for this team.'}</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ padding: 16, background: 'rgba(99,102,241,0.1)', borderRadius: 12, color: '#6366f1' }}>
            <Users size={32} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{data?.members?.length || 0}</div>
            <div style={{ color: 'var(--text-muted)' }}>Total Members</div>
          </div>
        </div>
        
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a855f7', fontWeight: 700 }}>
              <Activity size={20} /> AI Team Pulse
            </div>
            {!aiPulse && (
              <button onClick={generatePulse} disabled={pulseLoading} className="btn btn-ghost btn-sm">
                {pulseLoading ? <Loader2 size={14} className="animate-spin" /> : 'Generate'}
              </button>
            )}
          </div>
          {aiPulse ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, fontStyle: 'italic' }}>"{aiPulse}"</p>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Click generate to get an AI summary of your team's vibe.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TabMembers({ team }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['team-members', team.id],
    queryFn: () => teamAPI.getMembers(team.id).then(r => r.data)
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Enter an email');
    setInviteLoading(true);
    try {
      const res = await userAPI.search(email);
      const user = res.data.users?.find(u => u.email === email);
      if (!user) {
        toast.error('User not found. They must register first.');
        setInviteLoading(false);
        return;
      }
      await teamAPI.addMember(team.id, { user_id: user.id, role: 'member' });
      toast.success('Member added!');
      setEmail('');
      queryClient.invalidateQueries(['team-members', team.id]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally {
      setInviteLoading(false);
    }
  };

  const updateRole = async (userId, newRole) => {
    try {
      await teamAPI.updateMember(team.id, userId, { role: newRole });
      toast.success('Role updated');
      queryClient.invalidateQueries(['team-members', team.id]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  const removeMember = async (userId) => {
    if(!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await teamAPI.removeMember(team.id, userId);
      toast.success('Member removed');
      queryClient.invalidateQueries(['team-members', team.id]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  };

  if (isLoading) return <Loader2 className="animate-spin" />;

  const members = data?.members || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Invite Box */}
      <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Invite Member by Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com" className="input" />
        </div>
        <button onClick={handleInvite} disabled={inviteLoading} className="btn btn-primary" style={{ height: 42 }}>
          {inviteLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send Invite'}
        </button>
      </div>

      {/* Members List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-default)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Member</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Role</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: m.status === 'invited' ? 0.7 : 1 }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f122', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 'bold' }}>
                      {m.name ? m.name[0].toUpperCase() : <User size={16} />}
                    </div>
                    <span style={{ fontWeight: 500 }}>{m.name || 'Unknown User'}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  {m.status === 'invited' ? (
                    <span style={{ padding: '4px 8px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                      Pending
                    </span>
                  ) : (
                    <span style={{ padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                      Active
                    </span>
                  )}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <select 
                    value={m.role} 
                    onChange={e => updateRole(m.user_id, e.target.value)}
                    disabled={m.role === 'owner' || m.status === 'invited'}
                    className="input" 
                    style={{ width: '140px', padding: '6px 12px', height: 'auto' }}
                  >
                    <option value="owner" disabled>Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  {m.role !== 'owner' && (
                    <button onClick={() => removeMember(m.user_id)} className="btn btn-ghost" style={{ color: '#ef4444', padding: '6px 12px' }}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabSettings({ team }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(team.name);
  const [desc, setDesc] = useState(team.description || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await teamAPI.update(team.id, { name, description: desc });
      toast.success('Team updated');
      queryClient.invalidateQueries(['teams']);
    } catch(err) {
      toast.error('Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if(!window.confirm('WARNING: This will permanently delete the team and remove all members. Are you absolutely sure?')) return;
    try {
      await teamAPI.delete(team.id);
      toast.success('Team deleted');
      queryClient.invalidateQueries(['teams']);
    } catch(err) {
      toast.error('Failed to delete team');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div className="card" style={{ padding: 32 }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Edit2 size={20} color="#6366f1" /> Team Profile
        </h3>
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Team Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} className="input" style={{ minHeight: 100, resize: 'none' }} />
          </div>
          <div>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 32, border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.02)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trash2 size={20} /> Danger Zone
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          Deleting a team is irreversible. All team roles and member associations will be permanently removed.
        </p>
        <button onClick={handleDelete} className="btn" style={{ background: '#ef4444', color: '#fff', border: 'none' }}>
          Delete Team
        </button>
      </div>
    </div>
  );
}
