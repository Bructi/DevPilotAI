import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useAuthStore } from '../../store';
import { connectSocket } from '../../services/socket';
import { teamAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Maximize2, Minimize2, Save, Users, Wifi, WifiOff,
  Loader2, PenTool, CheckCircle2
} from 'lucide-react';

export default function TeamWhiteboard({ team }) {
  const { user } = useAuthStore();
  const [initialData, setInitialData] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const excalidrawAPI = useRef(null);
  const socketRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const containerRef = useRef(null);
  const saveTimerRef = useRef(null);

  // ── Load initial board state from DB ─────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    const fetchWhiteboard = async () => {
      try {
        const res = await teamAPI.getWhiteboard(team.id);
        if (res.data.whiteboard) {
          setInitialData({
            elements: res.data.whiteboard.elements || [],
            appState: {
              ...(res.data.whiteboard.appState || {}),
              collaborators: new Map(),
            },
            scrollToContent: true,
          });
        } else {
          setInitialData({ elements: [], appState: { collaborators: new Map() } });
        }
      } catch {
        toast.error('Failed to load whiteboard');
        setInitialData({ elements: [], appState: { collaborators: new Map() } });
      } finally {
        setIsLoading(false);
      }
    };
    fetchWhiteboard();
  }, [team.id]);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const socket = connectSocket(user.id, user.name);
    socketRef.current = socket;

    if (socket) {
      socket.emit('team:whiteboard:join', { teamId: team.id });
      setIsConnected(socket.connected);

      const handleUpdate = ({ elements }) => {
        if (!excalidrawAPI.current || isUpdatingRef.current) return;
        isUpdatingRef.current = true;
        excalidrawAPI.current.updateScene({ elements, commitToHistory: false });
        setTimeout(() => { isUpdatingRef.current = false; }, 80);
      };

      const handleOnlineCount = ({ count }) => setOnlineCount(count);
      const onConnect = () => setIsConnected(true);
      const onDisconnect = () => setIsConnected(false);

      socket.on('team:whiteboard:update', handleUpdate);
      socket.on('team:whiteboard:online', handleOnlineCount);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      return () => {
        socket.emit('team:whiteboard:leave', { teamId: team.id });
        socket.off('team:whiteboard:update', handleUpdate);
        socket.off('team:whiteboard:online', handleOnlineCount);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    }
  }, [team.id, user]);

  // ── Excalidraw change handler ─────────────────────────────────────────────
  const onChange = useCallback((elements, appState) => {
    if (isUpdatingRef.current) return;

    // Broadcast to peers (debounced via socket)
    if (socketRef.current?.connected) {
      socketRef.current.emit('team:whiteboard:update', {
        teamId: team.id,
        elements,
        appState: { viewBackgroundColor: appState.viewBackgroundColor },
      });
    }

    // Auto-save after 2s of inactivity
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToDb(elements, appState);
    }, 2000);
  }, [team.id]);

  // ── Save to DB ────────────────────────────────────────────────────────────
  const saveToDb = useCallback(async (elements, appState) => {
    try {
      setIsSaving(true);
      await teamAPI.updateWhiteboard(team.id, {
        elements,
        appState: { viewBackgroundColor: appState?.viewBackgroundColor },
      });
      setLastSaved(new Date());
    } catch {
      // silent
    } finally {
      setIsSaving(false);
    }
  }, [team.id]);

  const handleManualSave = () => {
    if (!excalidrawAPI.current) return;
    const elements = excalidrawAPI.current.getSceneElements();
    const appState = excalidrawAPI.current.getAppState();
    saveToDb(elements, appState);
  };

  // ── Fullscreen toggle using native browser API ────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ── Cleanup save timer ────────────────────────────────────────────────────
  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  // ── Format last saved time ────────────────────────────────────────────────
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const diff = Math.round((Date.now() - lastSaved) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    return `${Math.round(diff / 60)}m ago`;
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: 480,
        background: 'var(--bg-card)', borderRadius: 16,
        border: '1px solid var(--border-color)', gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PenTool size={26} color="#fff" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Loading Whiteboard…
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>Fetching your team canvas</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', flexDirection: 'column',
        borderRadius: isFullscreen ? 0 : 16,
        border: isFullscreen ? 'none' : '1px solid var(--border-color)',
        overflow: 'hidden',
        background: '#1a1a2e',
        height: isFullscreen ? '100vh' : 'calc(100vh - 240px)',
        minHeight: isFullscreen ? '100vh' : 500,
      }}
    >
      {/* ── Toolbar bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(20, 20, 40, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Left: branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PenTool size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              {team.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.2 }}>
              Collaborative Whiteboard
            </div>
          </div>
        </div>

        {/* Right: status + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Connection status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: isConnected ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${isConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            fontSize: '0.72rem', fontWeight: 600,
            color: isConnected ? '#10b981' : '#ef4444',
          }}>
            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isConnected ? 'Live' : 'Offline'}
          </div>

          {/* Online users */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
            fontSize: '0.72rem', fontWeight: 600, color: '#a5b4fc',
          }}>
            <Users size={12} />
            {onlineCount} online
          </div>

          {/* Save status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)',
          }}>
            {isSaving ? (
              <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} /> Saving…</>
            ) : lastSaved ? (
              <><CheckCircle2 size={12} color="#10b981" /> Saved {formatLastSaved()}</>
            ) : null}
          </div>

          {/* Manual save */}
          <button
            onClick={handleManualSave}
            title="Save now"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#a5b4fc', fontSize: '0.78rem', fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
          >
            <Save size={14} /> Save
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
              background: isFullscreen ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isFullscreen ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: isFullscreen ? '#c084fc' : 'rgba(255,255,255,0.6)',
              fontSize: '0.78rem', fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isFullscreen ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isFullscreen ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.06)'; }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* ── Excalidraw canvas ─────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Excalidraw
          excalidrawAPI={(api) => { excalidrawAPI.current = api; }}
          initialData={initialData}
          onChange={onChange}
          theme="dark"
          name={`${team.name} Whiteboard`}
          isCollaborating={isConnected}
        />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .excalidraw { height: 100% !important; }
        .excalidraw .App-menu_top { top: 8px !important; }
      `}</style>
    </div>
  );
}
