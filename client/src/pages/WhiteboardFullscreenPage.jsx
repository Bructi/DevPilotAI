import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TeamWhiteboard from '../components/team/TeamWhiteboard';
import { ArrowLeft } from 'lucide-react';

export default function WhiteboardFullscreenPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'var(--bg-primary)' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
        <button 
          onClick={() => navigate('/teams')} 
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Exit Full Screen
        </button>
      </div>
      <TeamWhiteboard team={{ id: teamId }} fullscreen={true} />
    </div>
  );
}
