import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'Inter, sans-serif', color: '#f8fafc' }}>
      <div>
        <div style={{ fontSize: '8rem', fontWeight: 900, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 8 }}>Page not found</h1>
        <p style={{ color: '#64748b', marginBottom: 32 }}>The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>
          <Home size={16} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
