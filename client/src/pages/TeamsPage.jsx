import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Loader2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamAPI, userAPI } from '../services/api';

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  
  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamAPI.getAll().then(res => res.data)
  });

  const createTeamMutation = useMutation({
    mutationFn: (name) => teamAPI.create({ name }),
    onSuccess: () => {
      toast.success('Team created successfully!');
      setNewTeamName('');
      setShowCreate(false);
      queryClient.invalidateQueries(['teams']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create team');
    }
  });

  const handleCreateTeam = (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return toast.error('Team name is required');
    createTeamMutation.mutate(newTeamName);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const teams = teamsData?.teams || [];

  return (
    <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Global Teams</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Manage teams across all your projects.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Create Team
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {teams.map(team => (
          <TeamCard key={team.id} team={team} />
        ))}
        {teams.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: 16 }}>
            <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>No Teams Yet</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Create a global team to manage members more easily.</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 32, width: 420 }}>
            <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Create New Team</h3>
            <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Team Name</label>
                <input autoFocus value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="e.g. Engineering, Marketing" className="input" />
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

function TeamCard({ team }) {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const { data } = useQuery({
    queryKey: ['team-members', team.id],
    queryFn: () => teamAPI.getMembers(team.id).then(r => r.data)
  });

  const members = data?.members || [];

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
      setShowInvite(false);
      queryClient.invalidateQueries(['team-members', team.id]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{team.name}</h3>
        <span style={{ fontSize: '0.8rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>
          {members.length} Members
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f122', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#818cf8' }}>
              {m.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.name}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setShowInvite(true)} className="btn btn-secondary btn-sm" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 'auto' }}>
        <UserPlus size={14} /> Add Member
      </button>

      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 32, width: 420 }}>
            <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Add to {team.name}</h3>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Email Address</label>
                <input type="email" autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@example.com" className="input" />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" onClick={() => setShowInvite(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={inviteLoading} className="btn btn-primary">
                  {inviteLoading ? <Loader2 size={16} className="animate-spin" /> : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
