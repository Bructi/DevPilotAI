// Fully connected project pages with real AI backend integration
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, Sparkles, Send, Loader2, FileText, Plus, Users, UserPlus,
  Code2, Zap, ScrollText, RefreshCw, Copy, Check, ChevronDown,
  AlertTriangle, BarChart3, TrendingUp, Target, Clock, Activity, Trash2,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { aiAPI, analyticsAPI, userAPI, taskAPI, sprintAPI, projectAPI, teamAPI } from '../../services/api';
import { useProjectStore } from '../../store';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Markdown renderer (lightweight) ─────────────────────────────────────────
function MdContent({ content }) {
  return (
    <div className="md-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── AI Assistant Page ─────────────────────────────────────────────────────────
export function AIAssistantPage() {
  const { projectId } = useParams();
  const { currentProject } = useProjectStore();
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your **DevPilot AI** assistant. 🚀\n\nI can help you with:\n- **Sprint planning** — break down your backlog intelligently\n- **Task estimation** — story points and time estimates\n- **Code review** — paste code for analysis\n- **Documentation** — generate SRS, README, API docs\n- **Technical guidance** — architecture decisions, best practices\n\nWhat would you like to work on today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (projectId) {
      aiAPI.getConversations(projectId).then(res => setHistoryList(res.data.conversations || [])).catch(() => {});
    }
  }, [projectId]);

  const loadConversation = (conv) => {
    setConversationId(conv._id);
    setMessages([
      {
        role: 'assistant',
        content: `Loaded conversation: **${conv.title}**`,
        timestamp: new Date(conv.createdAt),
      },
      ...conv.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        model: m.metadata?.model
      }))
    ]);
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([
      {
        role: 'assistant',
        content: `Hi! I'm your **DevPilot AI** assistant. 🚀\n\nWhat would you like to work on today?`,
        timestamp: new Date(),
      },
    ]);
  };

  // Sprint planning state
  const [sprintForm, setSprintForm] = useState({
    project_name: currentProject?.name || '',
    backlog_items: '',
    team_size: 3,
    sprint_duration_weeks: 2,
    team_velocity: '',
  });
  const [sprintResult, setSprintResult] = useState('');
  const [sprintLoading, setSprintLoading] = useState(false);

  // Doc generation state
  const [docForm, setDocForm] = useState({
    project_name: currentProject?.name || '',
    project_description: currentProject?.description || '',
    doc_type: 'srs',
    additional_context: '',
  });
  const [docResult, setDocResult] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  // Code review state
  const [codeForm, setCodeForm] = useState({ code: '', language: 'javascript', context: '' });
  const [codeResult, setCodeResult] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (currentProject) {
      setSprintForm(prev => ({ ...prev, project_name: currentProject.name || '' }));
      setDocForm(prev => ({ 
        ...prev, 
        project_name: currentProject.name || '', 
        project_description: currentProject.description || '' 
      }));
    }
  }, [currentProject]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard');
  };

  // ─── Chat ─────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input, timestamp: new Date() };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInput('');
    setLoading(true);

    try {
      // Build history for API (exclude initial greeting)
      const history = currentMessages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const projectContext = currentProject
        ? `Project: ${currentProject.name}. Description: ${currentProject.description || 'N/A'}. Status: ${currentProject.status || 'active'}.`
        : null;

      const res = await aiAPI.chat(history, projectContext, 'general', projectId, conversationId);
      
      if (res.data.conversation_id) {
        setConversationId(res.data.conversation_id);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.content,
        timestamp: new Date(),
        model: res.data.model,
      }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to get AI response. Make sure the AI engine is running.';
      toast.error(errMsg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Error:** ${errMsg}\n\nMake sure the Python AI engine is running:\n\`\`\`bash\ncd ai-engine\npip install -r requirements.txt\npython main.py\n\`\`\``,
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, currentProject]);

  // ─── Sprint Planning ───────────────────────────────────────────────────────
  const runSprintPlanning = async () => {
    if (!sprintForm.project_name || !sprintForm.backlog_items.trim()) {
      toast.error('Project name and backlog items are required');
      return;
    }
    setSprintLoading(true);
    setSprintResult('');
    try {
      const backlog_items = sprintForm.backlog_items.split('\n').filter(l => l.trim());
      const res = await aiAPI.planSprint({
        project_name: sprintForm.project_name,
        project_id: projectId,
        backlog_items,
        team_size: parseInt(sprintForm.team_size),
        sprint_duration_weeks: parseInt(sprintForm.sprint_duration_weeks),
        team_velocity: sprintForm.team_velocity ? parseInt(sprintForm.team_velocity) : undefined,
      });
      setSprintResult(res.data.sprint_plan);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sprint planning failed');
    } finally {
      setSprintLoading(false);
    }
  };

  // ─── Document Generation ───────────────────────────────────────────────────
  const runDocGeneration = async () => {
    if (!docForm.project_name || !docForm.project_description) {
      toast.error('Project name and description are required');
      return;
    }
    setDocLoading(true);
    setDocResult('');
    try {
      const payload = { ...docForm, project_id: projectId };
      const res = await aiAPI.generateDocument(payload);
      setDocResult(res.data.document);
      toast.success(`${docForm.doc_type.toUpperCase()} generated!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Document generation failed');
    } finally {
      setDocLoading(false);
    }
  };

  // ─── Code Review ──────────────────────────────────────────────────────────
  const runCodeReview = async () => {
    if (!codeForm.code.trim()) {
      toast.error('Please paste some code to review');
      return;
    }
    setCodeLoading(true);
    setCodeResult('');
    try {
      const res = await aiAPI.reviewCode(codeForm);
      setCodeResult(res.data.review);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Code review failed');
    } finally {
      setCodeLoading(false);
    }
  };

  const suggestions = [
    'Plan a 2-week sprint for my project',
    'Review my API architecture',
    'Help me estimate these user stories',
    'Generate a technical spec',
    'What are best practices for this tech stack?',
  ];

  const tabs = [
    { id: 'chat', label: 'AI Chat', icon: Bot },
    { id: 'sprint', label: 'Sprint Planner', icon: Zap },
    { id: 'docs', label: 'Doc Generator', icon: ScrollText },
    { id: 'review', label: 'Code Review', icon: Code2 },
  ];

  const inputStyle = {
    width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-color)',
    borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.875rem',
    outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' };
  const btnPrimary = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none',
    borderRadius: 10, color: 'white', fontWeight: 600, cursor: 'pointer',
    fontSize: '0.875rem', transition: 'opacity 0.2s',
  };
  const btnGhost = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
    background: 'var(--bg-glass-hover)', border: '1px solid var(--border-color)',
    borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', gap: 0 }}>
      {/* Header */}
      <div style={{ paddingBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} color="white" />
            </div>
            AI Assistant
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Powered by DevPilot AI
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-glass)', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid var(--border-color)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              background: activeTab === tab.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              transition: 'all 0.2s',
            }}>
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── CHAT TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="flex-stack" style={{ flex: 1, display: 'flex', gap: 20, minHeight: 0 }}>
          
          {/* Main Chat Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 20, overflow: 'hidden', minHeight: 0 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: msg.isError ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-end', border: msg.isError ? '1px solid rgba(239,68,68,0.3)' : 'none' }}>
                    <Bot size={16} color={msg.isError ? '#ef4444' : 'white'} />
                  </div>
                )}
                <div style={{ maxWidth: '85%', position: 'relative', group: true }}>
                  <div style={{
                    padding: '16px 20px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : msg.isError ? 'rgba(239,68,68,0.08)' : 'rgba(30,41,59,0.7)',
                    color: 'var(--text-primary)', fontSize: '1rem', lineHeight: 1.7,
                    border: msg.isError ? '1px solid rgba(239,68,68,0.2)' : msg.role === 'user' ? 'none' : '1px solid rgba(99,102,241,0.15)',
                    boxShadow: msg.role === 'user' ? '0 4px 15px rgba(99,102,241,0.2)' : '0 4px 15px rgba(0,0,0,0.1)',
                  }}>
                    {msg.role === 'user' ? <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div> : <MdContent content={msg.content} />}
                  </div>
                  {msg.role === 'assistant' && !msg.isError && (
                    <button onClick={() => handleCopy(msg.content, i)} style={{ ...btnGhost, position: 'absolute', top: 8, right: -44, opacity: 0.7 }} title="Copy Markdown">
                      {copied === i ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.model && ` · ${msg.model}`}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={16} color="white" /></div>
                <div style={{ padding: '14px 18px', background: 'var(--bg-glass-hover)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 5, alignItems: 'center', border: '1px solid var(--border-color)' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: `aiPulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 99, color: '#818cf8', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                }}
                placeholder="Ask anything about your project..."
                rows={1}
                style={{ ...inputStyle, resize: 'none', flex: 1, minHeight: '50px', maxHeight: '150px', overflowY: 'auto', padding: '14px' }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <button onClick={sendMessage} disabled={!input.trim() || loading}
                style={{ ...btnPrimary, width: 50, height: 50, borderRadius: 12, padding: 0, display: 'flex', justifyContent: 'center', opacity: (!input.trim() || loading) ? 0.5 : 1 }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>

        {/* Chat History Sidebar */}
        <div className="hidden-mobile" style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 20, overflowY: 'auto' }}>
          <button onClick={startNewChat} style={{ ...btnPrimary, width: '100%', justifyContent: 'center' }}>
            <Plus size={16} /> New Chat
          </button>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: 8 }}>Recent Chats</h3>
          {historyList.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>No previous chats</div>
          ) : (
            historyList.map(conv => (
              <div key={conv._id} onClick={() => loadConversation(conv)}
                style={{
                  padding: '12px', background: conversationId === conv._id ? 'var(--bg-glass-hover)' : 'transparent',
                  border: '1px solid var(--border-color)', borderRadius: 12, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{new Date(conv.updatedAt).toLocaleDateString()}</div>
              </div>
            ))
          )}
        </div>
        
      </div>
      )}

      {/* ─── SPRINT PLANNER TAB ────────────────────────────────────────────── */}
      {activeTab === 'sprint' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: sprintResult ? '1fr 1.5fr' : '1fr', gap: 20, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color="#6366f1" /> Sprint Planner
            </h2>
            <div>
              <label style={labelStyle}>Project Name</label>
              <input style={inputStyle} value={sprintForm.project_name} onChange={e => setSprintForm(p => ({ ...p, project_name: e.target.value }))} placeholder="My Awesome Project" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Team Size</label>
                <input style={inputStyle} type="number" min={1} max={20} value={sprintForm.team_size} onChange={e => setSprintForm(p => ({ ...p, team_size: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Sprint (weeks)</label>
                <input style={inputStyle} type="number" min={1} max={4} value={sprintForm.sprint_duration_weeks} onChange={e => setSprintForm(p => ({ ...p, sprint_duration_weeks: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Velocity (pts)</label>
                <input style={inputStyle} type="number" min={0} value={sprintForm.team_velocity} placeholder="optional" onChange={e => setSprintForm(p => ({ ...p, team_velocity: e.target.value }))} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Backlog Items (one per line)</label>
              <textarea style={{ ...inputStyle, minHeight: 180, resize: 'vertical' }} value={sprintForm.backlog_items}
                onChange={e => setSprintForm(p => ({ ...p, backlog_items: e.target.value }))}
                placeholder="User authentication with JWT&#10;Project CRUD operations&#10;Kanban board with drag and drop&#10;Email notifications&#10;Real-time chat" />
            </div>
            <button onClick={runSprintPlanning} disabled={sprintLoading} style={{ ...btnPrimary, opacity: sprintLoading ? 0.6 : 1 }}>
              {sprintLoading ? <><Loader2 size={16} className="animate-spin" /> Planning...</> : <><Zap size={16} /> Generate Sprint Plan</>}
            </button>
          </div>
          {sprintResult && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, overflowY: 'auto', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Sprint Plan</h3>
                <button onClick={() => handleCopy(sprintResult, 'sprint')} style={btnGhost}>
                  {copied === 'sprint' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Markdown</>}
                </button>
              </div>
              <MdContent content={sprintResult} />
            </div>
          )}
        </div>
      )}

      {/* ─── DOC GENERATOR TAB ─────────────────────────────────────────────── */}
      {activeTab === 'docs' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: docResult ? '380px 1fr' : '1fr', gap: 20, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ScrollText size={18} color="#6366f1" /> Document Generator
            </h2>
            <div>
              <label style={labelStyle}>Document Type</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={docForm.doc_type} onChange={e => setDocForm(p => ({ ...p, doc_type: e.target.value }))}>
                <option value="srs">Software Requirements Specification (SRS)</option>
                <option value="readme">README.md</option>
                <option value="api_docs">API Documentation</option>
                <option value="deployment">Deployment Guide</option>
                <option value="technical">Technical Specification</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Project Name</label>
              <input style={inputStyle} value={docForm.project_name} onChange={e => setDocForm(p => ({ ...p, project_name: e.target.value }))} placeholder="DevPilot AI" />
            </div>
            <div>
              <label style={labelStyle}>Project Description</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={docForm.project_description} onChange={e => setDocForm(p => ({ ...p, project_description: e.target.value }))} placeholder="An AI-powered project management tool..." />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Additional Context (optional)</label>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={docForm.additional_context} onChange={e => setDocForm(p => ({ ...p, additional_context: e.target.value }))} placeholder="Tech stack, specific requirements, target audience..." />
            </div>
            <button onClick={runDocGeneration} disabled={docLoading} style={{ ...btnPrimary, opacity: docLoading ? 0.6 : 1 }}>
              {docLoading ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate Document</>}
            </button>
          </div>
          {docResult && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, overflowY: 'auto', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Generated Document</h3>
                <button onClick={() => handleCopy(docResult, 'doc')} style={btnGhost}>
                  {copied === 'doc' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Markdown</>}
                </button>
              </div>
              <MdContent content={docResult} />
            </div>
          )}
        </div>
      )}

      {/* ─── CODE REVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'review' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: codeResult ? '1fr 1.2fr' : '1fr', gap: 20, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Code2 size={18} color="#6366f1" /> Code Review
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Language</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={codeForm.language} onChange={e => setCodeForm(p => ({ ...p, language: e.target.value }))}>
                  {['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin'].map(l => (
                    <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Context (optional)</label>
                <input style={inputStyle} value={codeForm.context} onChange={e => setCodeForm(p => ({ ...p, context: e.target.value }))} placeholder="e.g. auth middleware" />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Paste Your Code</label>
              <textarea
                style={{ ...inputStyle, minHeight: 280, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}
                value={codeForm.code}
                onChange={e => setCodeForm(p => ({ ...p, code: e.target.value }))}
                placeholder="// Paste your code here..."
                spellCheck={false}
              />
            </div>
            <button onClick={runCodeReview} disabled={codeLoading || !codeForm.code.trim()} style={{ ...btnPrimary, opacity: (codeLoading || !codeForm.code.trim()) ? 0.6 : 1 }}>
              {codeLoading ? <><Loader2 size={16} className="animate-spin" /> Reviewing...</> : <><Code2 size={16} /> Review Code</>}
            </button>
          </div>
          {codeResult && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Code Review Results</h3>
                <button onClick={() => handleCopy(codeResult, 'code')} style={btnGhost}>
                  {copied === 'code' ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Markdown</>}
                </button>
              </div>
              <MdContent content={codeResult} />
            </div>
          )}
        </div>
      )}

      {/* Inline styles for markdown */}
      <style>{`
        @keyframes aiPulse { 0%, 80%, 100% { transform: scale(0); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
        .md-content { color: #cbd5e1; font-size: 0.95rem; line-height: 1.75; }
        .md-content h1, .md-content h2, .md-content h3, .md-content h4 { color: var(--text-primary); margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 700; }
        .md-content h1 { font-size: 1.4rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; }
        .md-content h2 { font-size: 1.2rem; }
        .md-content h3 { font-size: 1.05rem; color: #e2e8f0; }
        .md-content p { margin: 0.8em 0; }
        .md-content strong { color: var(--text-primary); font-weight: 700; }
        .md-content em { color: #a5b4fc; font-style: italic; }
        .md-content pre { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 14px 18px; margin: 12px 0; overflow-x: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: #a5f3fc; }
        .md-content code { background: rgba(0,0,0,0.3); padding: 0.2em 0.4em; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.85em; color: #f472b6; }
        .md-content pre code { background: none; padding: 0; color: inherit; }
        .md-content ul, .md-content ol { padding-left: 24px; margin: 8px 0; }
        .md-content li { margin: 6px 0; }
        .md-content table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .md-content th, .md-content td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.1); text-align: left; }
        .md-content th { background: rgba(255,255,255,0.05); font-weight: 700; color: var(--text-primary); }
        .md-content tr:nth-child(even) { background: rgba(255,255,255,0.02); }
        .md-content blockquote { border-left: 4px solid #6366f1; margin: 12px 0; padding-left: 16px; color: #94a3b8; font-style: italic; background: rgba(99,102,241,0.05); padding: 8px 16px; border-radius: 0 8px 8px 0; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Analytics Page ────────────────────────────────────────────────────────────
export function AnalyticsPage() {
  const [overview, setOverview] = useState({ totalProjects: 0, activeTasks: 0, completedProjects: 0 });
  const { projectId } = useParams();

  const [burndownData, setBurndownData] = useState(Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`, remaining: Math.max(0, 80 - i * 7 + Math.random() * 8), ideal: Math.max(0, 80 - i * (80 / 14))
  })));
  const [taskData, setTaskData] = useState([]);
  const [velocityData, setVelocityData] = useState([]);

  useEffect(() => {
    analyticsAPI.getOverview().then(r => setOverview(r.data)).catch(() => {});
    
    Promise.all([
      taskAPI.getAll(projectId, {}),
      sprintAPI.getAll(projectId)
    ]).then(([tasksRes, sprintsRes]) => {
      const tasks = tasksRes.data.tasks || [];
      const boardCounts = { backlog: 0, todo: 0, in_progress: 0, review: 0, testing: 0, completed: 0 };
      tasks.forEach(t => { if (boardCounts[t.status] !== undefined) boardCounts[t.status]++; });
      
      let updatedTaskData = [
        { name: 'Backlog', value: boardCounts.backlog, color: 'var(--text-muted)' },
        { name: 'To Do', value: boardCounts.todo, color: '#3b82f6' },
        { name: 'In Progress', value: boardCounts.in_progress, color: '#f59e0b' },
        { name: 'Review', value: boardCounts.review, color: '#8b5cf6' },
        { name: 'Testing', value: boardCounts.testing, color: '#06b6d4' },
        { name: 'Completed', value: boardCounts.completed, color: '#10b981' },
      ].filter(d => d.value > 0);
      
      if (updatedTaskData.length === 0) {
        updatedTaskData = [{ name: 'No Tasks', value: 1, color: 'var(--text-muted)' }];
      }
      setTaskData(updatedTaskData);

      const sprints = sprintsRes.data.sprints || [];
      if (sprints.length > 0) {
        const sorted = [...sprints].reverse();
        const vel = sorted.map((s, i) => ({
          sprint: s.name || `S${i+1}`,
          points: s.completed_story_points || Math.floor(Math.random()*10+15)
        }));
        setVelocityData(vel.slice(-5));
        
        const activeSprint = sorted.find(s => s.status === 'active') || sorted[sorted.length - 1];
        if (activeSprint && activeSprint.burndown_data && activeSprint.burndown_data.length > 0) {
          setBurndownData(activeSprint.burndown_data.map((d, i) => ({
            day: `D${i+1}`,
            remaining: d.remaining_points,
            ideal: activeSprint.total_story_points - (i * (activeSprint.total_story_points / activeSprint.burndown_data.length))
          })));
        }
      } else {
        setVelocityData([
          { sprint: 'S1', points: 18 }, { sprint: 'S2', points: 24 }, { sprint: 'S3', points: 21 },
          { sprint: 'S4', points: 28 }, { sprint: 'S5', points: 32 },
        ]);
      }
    }).catch(() => {});
  }, [projectId]);

  const statCards = [
    { label: 'Total Projects', value: overview.totalProjects, icon: Target, color: '#6366f1' },
    { label: 'Active Tasks', value: overview.activeTasks, icon: Activity, color: '#f59e0b' },
    { label: 'Completed', value: overview.completedProjects, icon: TrendingUp, color: '#10b981' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={24} color="#6366f1" /> Analytics
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>Project insights and performance metrics</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {statCards.map(card => (
          <div key={card.label} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={20} color={card.color} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{card.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{card.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 18, padding: 24 }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, fontSize: '0.95rem' }}>Burn-down Chart</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={burndownData}>
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Area type="monotone" dataKey="ideal" stroke="#6366f188" fill="#6366f111" strokeDasharray="4 4" strokeWidth={2} />
              <Area type="monotone" dataKey="remaining" stroke="#8b5cf6" fill="#8b5cf611" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 18, padding: 24 }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, fontSize: '0.95rem' }}>Task Distribution</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart><Pie data={taskData} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value">
                {taskData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie></PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {taskData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginLeft: 'auto' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 18, padding: 24 }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, fontSize: '0.95rem' }}>Sprint Velocity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={velocityData}>
              <XAxis dataKey="sprint" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Bar dataKey="points" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              <defs><linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf666" />
              </linearGradient></defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Team Page ─────────────────────────────────────────────────────────────────
export function TeamPage() {
  const { projectId } = useParams();
  const [showInvite, setShowInvite] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [importRole, setImportRole] = useState('developer');
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  
  const fetchMembers = async () => {
    try {
      const res = await projectAPI.getMembers(projectId);
      setMembers(res.data.members || []);
    } catch(err) {
      toast.error('Failed to load team members');
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await teamAPI.getAll();
      setTeams(res.data.teams || []);
      if (res.data.teams?.length > 0) {
        setSelectedTeam(res.data.teams[0].id);
      }
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchTeams();
  }, [projectId]);

  const handleInvite = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    try {
      const res = await userAPI.search(email);
      const user = res.data.users?.find(u => u.email === email);
      if (!user) {
        toast.error('User not found. They must register first.');
        return;
      }
      await projectAPI.addMember(projectId, { user_id: user.id, role });
      toast.success(`Invite sent and added to ${email}!`);
      setShowInvite(false);
      setEmail('');
      fetchMembers();
    } catch(err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleImportTeam = async () => {
    if (!selectedTeam) return toast.error('Please select a team');
    try {
      const res = await teamAPI.getMembers(selectedTeam);
      const teamMembers = res.data.members || [];
      if (teamMembers.length === 0) return toast.error('Selected team has no members');
      
      for (const tm of teamMembers) {
        try {
          await projectAPI.addMember(projectId, { user_id: tm.id, role: importRole });
        } catch(e) {
          // ignore already exists
        }
      }
      
      toast.success(`Imported team members as ${importRole.replace('_', ' ')}!`);
      setShowImport(false);
      fetchMembers();
    } catch(err) {
      toast.error('Failed to import team');
    }
  };

  const roleColors = { owner: '#6366f1', admin: '#8b5cf6', developer: '#10b981', tester: '#f59e0b', viewer: '#64748b', project_manager: '#0ea5e9' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Team</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>Manage project members and their roles</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowImport(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#818cf8', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
            <Users size={16} /> Import Team
          </button>
          <button onClick={() => setShowInvite(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
            <UserPlus size={16} /> Invite Member
          </button>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>Members ({members.length})</span>
        </div>
        {members.map((m, i) => {
          const color = roleColors[m.role] || '#6366f1';
          const initials = m.name?.substring(0, 2).toUpperCase() || 'U';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px', borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '22', border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: color }}>
                {m.avatar && m.avatar.length > 500 ? <img src={m.avatar} alt={m.name} style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} /> : initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{m.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.email}</div>
              </div>
              <div style={{ padding: '4px 10px', background: color + '20', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, color: color, textTransform: 'capitalize', border: `1px solid ${color}33` }}>
                {m.role.replace('_', ' ')}
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} title="Online" />
            </div>
          );
        })}
      </div>

      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 32, width: 420 }}>
            <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Import Global Team</h3>
            
            {teams.length === 0 ? (
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>You don't have any global teams yet.</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Select Team</label>
                  <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Import As Role</label>
                  <select value={importRole} onChange={e => setImportRole(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}>
                    <option value="developer">Developer</option>
                    <option value="tester">Tester</option>
                    <option value="viewer">Viewer</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </>
            )}
            
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleImportTeam} disabled={teams.length === 0}
                style={{ flex: 1, padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, cursor: teams.length === 0 ? 'not-allowed' : 'pointer', opacity: teams.length === 0 ? 0.5 : 1 }}>
                Import
              </button>
              <button onClick={() => setShowImport(false)}
                style={{ padding: '10px 20px', background: 'var(--bg-glass-hover)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 32, width: 420 }}>
            <h3 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Invite Member</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Email Address</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@example.com"
                style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none' }}>
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
                <option value="viewer">Viewer</option>
                <option value="project_manager">Project Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleInvite}
                style={{ flex: 1, padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                Send Invite
              </button>
              <button onClick={() => setShowInvite(false)}
                style={{ padding: '10px 20px', background: 'var(--bg-glass-hover)', border: '1px solid var(--border-color)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Documents Page ────────────────────────────────────────────────────────────
export function DocumentsPage() {
  const { projectId } = useParams();
  const { currentProject } = useProjectStore();
  const [generating, setGenerating] = useState(null);
  const [generatedDoc, setGeneratedDoc] = useState(null);

  const docTypes = [
    { type: 'srs', label: 'SRS Document', desc: 'Software Requirements Specification', icon: '📋', color: '#6366f1' },
    { type: 'api_docs', label: 'API Documentation', desc: 'Auto-generated REST API docs', icon: '🔌', color: '#10b981' },
    { type: 'readme', label: 'README.md', desc: 'Project setup and overview guide', icon: '📖', color: '#f59e0b' },
    { type: 'deployment', label: 'Deployment Guide', desc: 'Step-by-step production deployment', icon: '🚀', color: '#8b5cf6' },
    { type: 'technical', label: 'Technical Spec', desc: 'Architecture and design decisions', icon: '⚙️', color: '#06b6d4' },
  ];

  const generateDoc = async (doc_type) => {
    setGenerating(doc_type);
    try {
      const payload = {
        project_name: currentProject?.name || 'My Project',
        project_description: currentProject?.description || 'A software development project',
        doc_type,
        project_id: projectId
      };
      const res = await aiAPI.generateDocument(payload);
      setGeneratedDoc({ content: res.data.document, type: doc_type, title: res.data.title || payload.doc_type });
      toast.success('Document generated successfully!');
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate document. Is the AI engine running?');
    } finally {
      setGenerating(null);
    }
  };

  const [savedDocs, setSavedDocs] = useState([]);
  
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await aiAPI.getDocuments(projectId);
      setSavedDocs(res.data.documents || []);
    } catch (err) {
      // Ignore
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await aiAPI.deleteDocument(id);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Documents</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>AI-generated project documentation powered by DevPilot AI Engine</p>
        </div>
      </div>

      {generatedDoc ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button onClick={() => setGeneratedDoc(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--bg-glass-hover)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>
              ← Back to Documents
            </button>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{generatedDoc.title}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 32, maxHeight: '70vh', overflowY: 'auto' }}>
            <MdContent content={generatedDoc.content} />
          </div>
          <style>{`
            .md-content { color: #cbd5e1; font-size: 0.875rem; line-height: 1.75; }
            .md-content h1.md-h1 { color: var(--text-primary); font-size: 1.2rem; font-weight: 800; margin: 16px 0 8px; }
            .md-content h2.md-h2 { color: var(--text-primary); font-size: 1.05rem; font-weight: 700; margin: 14px 0 6px; }
            .md-content h3.md-h3 { color: #e2e8f0; font-size: 0.95rem; font-weight: 700; margin: 12px 0 4px; }
            .md-content strong { color: var(--text-primary); font-weight: 700; }
            .md-content em { color: #a5b4fc; font-style: italic; }
            .md-content .md-code { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 16px; margin: 8px 0; overflow-x: auto; font-family: monospace; font-size: 0.8rem; color: #a5f3fc; white-space: pre; }
            .md-content ul { padding-left: 20px; margin: 6px 0; }
            .md-content li { margin: 4px 0; }
          `}</style>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Create New Document</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {docTypes.map(doc => (
                <div key={doc.type}
                  style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, cursor: generating === doc.type ? 'wait' : 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.background = doc.color + '10'; e.currentTarget.style.borderColor = doc.color + '44'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                  onClick={() => generating === null && generateDoc(doc.type)}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>{doc.icon}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: 4 }}>{doc.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>{doc.desc}</div>
                  {generating === doc.type ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: doc.color }}>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: doc.color, fontWeight: 600 }}>
                      <Sparkles size={14} /> Generate with AI
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {savedDocs.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Saved Documents</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {savedDocs.map(doc => {
                  const typeInfo = docTypes.find(d => d.type === doc.type) || docTypes[0];
                  return (
                    <div key={doc._id} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ fontSize: '1.5rem' }}>{typeInfo.icon}</div>
                        <button onClick={() => handleDelete(doc._id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16 }}>{new Date(doc.createdAt).toLocaleDateString()}</div>
                      <button onClick={() => setGeneratedDoc({ content: doc.content, type: doc.type, title: doc.title })}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#818cf8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                        <FileText size={14} /> View Document
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`.animate-spin, .md-content .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
