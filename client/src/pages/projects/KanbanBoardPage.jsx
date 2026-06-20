import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, X, Loader2, GripVertical, Calendar, User, Flag,
  MessageSquare, Paperclip, CheckSquare, Clock, AlertTriangle, Sparkles, ArrowLeft, Trash2, CheckCircle2, Search, Zap, Wand2, BrainCircuit
} from 'lucide-react';
import { taskAPI, aiAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getSocket, joinProject } from '../../services/socket';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: 'var(--text-muted)' },
  { id: 'todo', label: 'To Do', color: '#3b82f6' },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'review', label: 'Review', color: '#8b5cf6' },
  { id: 'testing', label: 'Testing', color: '#06b6d4' },
  { id: 'completed', label: 'Completed', color: '#10b981' },
];

const PRIORITY_CONFIG = {
  critical: { color: '#ef4444', icon: '🔴', label: 'Critical' },
  high: { color: '#f59e0b', icon: '🟠', label: 'High' },
  medium: { color: '#6366f1', icon: '🔵', label: 'Medium' },
  low: { color: '#10b981', icon: '🟢', label: 'Low' },
};

export default function KanbanBoardPage() {
  const { projectId } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [board, setBoard] = useState({});
  const [activeTask, setActiveTask] = useState(null);
  const [showAddTask, setShowAddTask] = useState(null);
  const [showAiSuggest, setShowAiSuggest] = useState(false);
  const [showAiKanban, setShowAiKanban] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const searchInputRef = React.useRef(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setPriorityFilter('all');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data, isLoading } = useQuery({
    queryKey: ['kanban-board', projectId],
    queryFn: () => taskAPI.getBoard(projectId).then(r => r.data.board),
    onSuccess: (data) => setBoard(data),
  });

  useEffect(() => {
    if (data) setBoard(data);
  }, [data]);

  // Socket.IO for real-time updates
  useEffect(() => {
    joinProject(projectId);
    const socket = getSocket();
    if (!socket) return;

    socket.on('task:created', ({ task }) => {
      queryClient.invalidateQueries(['kanban-board', projectId]);
    });
    socket.on('task:moved', () => {
      queryClient.invalidateQueries(['kanban-board', projectId]);
    });
    socket.on('task:updated', () => {
      queryClient.invalidateQueries(['kanban-board', projectId]);
    });

    return () => {
      socket.off('task:created');
      socket.off('task:moved');
      socket.off('task:updated');
    };
  }, [projectId]);

  const moveMutation = useMutation({
    mutationFn: ({ taskId, data }) => taskAPI.move(projectId, taskId, data),
    onError: () => {
      toast.error('Failed to move task');
      queryClient.invalidateQueries(['kanban-board', projectId]);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => taskAPI.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['kanban-board', projectId]);
      setShowAddTask(null);
      toast.success('Task created!');
    },
    onError: () => toast.error('Failed to create task'),
  });

  const handleDragStart = ({ active }) => {
    for (const col of Object.values(board)) {
      const task = col.find(t => t._id === active.id);
      if (task) { setActiveTask(task); break; }
    }
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const sourceCol = Object.keys(board).find(col => board[col].some(t => t._id === active.id));
    const destCol = over.data.current?.columnId || Object.keys(board).find(col => board[col].some(t => t._id === over.id));

    if (!sourceCol || !destCol) return;

    const newBoard = { ...board };

    if (sourceCol === destCol) {
      // Reorder within same column
      const tasks = [...newBoard[sourceCol]];
      const oldIdx = tasks.findIndex(t => t._id === active.id);
      const newIdx = tasks.findIndex(t => t._id === over.id);
      newBoard[sourceCol] = arrayMove(tasks, oldIdx, newIdx);
    } else {
      // Move to different column
      const sourceTasks = [...newBoard[sourceCol]];
      const destTasks = [...newBoard[destCol]];
      const taskIdx = sourceTasks.findIndex(t => t._id === active.id);
      const [task] = sourceTasks.splice(taskIdx, 1);
      task.status = destCol;
      destTasks.push(task);
      newBoard[sourceCol] = sourceTasks;
      newBoard[destCol] = destTasks;

      moveMutation.mutate({ taskId: active.id, data: { newStatus: destCol, newOrder: destTasks.length - 1, sourceStatus: sourceCol } });
    }

    setBoard(newBoard);
  };

  const completeMutation = useMutation({
    mutationFn: (taskId) => taskAPI.update(projectId, taskId, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['kanban-board', projectId]);
      toast.success('Task marked as complete');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId) => taskAPI.delete(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries(['kanban-board', projectId]);
      toast.success('Task deleted');
    }
  });

  const handleCompleteTask = (task) => completeMutation.mutate(task._id);
  const handleDeleteTask = (task) => {
    if(window.confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate(task._id);
    }
  };

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link to={`/projects/${projectId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#818cf8', fontSize: '0.85rem', textDecoration: 'none', width: 'fit-content', fontWeight: 500 }}>
          <ArrowLeft size={14} /> Back to Project Details
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Kanban Board</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 2 }}>
              {Object.values(board).flat().length} total tasks · Drag to move between columns
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAiSuggest(true)} style={{ gap: 6 }}>
              <Sparkles size={13} /> AI Suggestions
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAiKanban(true)} style={{ gap: 6, background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.18))', border: '1px solid rgba(168,85,247,0.35)', color: '#c084fc' }}>
              <BrainCircuit size={13} /> AI Generate Board
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddTask('backlog')} style={{ gap: 6 }}>
              <Plus size={14} /> Add Task
            </button>
          </div>
        </div>

        {/* ─── Search & Filter Bar ─── */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search tasks... (Press '/')" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.85rem' }}
            />
          </div>
          <select 
            value={priorityFilter} 
            onChange={e => setPriorityFilter(e.target.value)}
            style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.85rem' }}
          >
            <option value="all">All Priorities</option>
            {Object.entries(PRIORITY_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', flex: 1, gap: 14, overflowX: 'auto', paddingBottom: 16, paddingRight: 24, minHeight: 400 }}>
          {COLUMNS.map(col => {
            // Apply Filters
            const filteredTasks = (board[col.id] || []).filter(t => {
              if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
              if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
              return true;
            });

            return (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={filteredTasks}
                onAddTask={() => setShowAddTask(col.id)}
                onTaskClick={setSelectedTask}
                onComplete={handleCompleteTask}
                onDelete={handleDeleteTask}
                projectId={projectId}
              />
            );
          })}
          <div style={{ minWidth: 24, flexShrink: 0 }} />
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Add Task Panel */}
      <AnimatePresence>
        {showAddTask && (
          <AddTaskPanel
            columnId={showAddTask}
            onClose={() => setShowAddTask(null)}
            onSubmit={(data) => createMutation.mutate({ ...data, status: showAddTask })}
            loading={createMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* AI Suggest Tasks Modal */}
      <AnimatePresence>
        {showAiSuggest && (
          <AiSuggestTasksModal
            projectId={projectId}
            onClose={() => setShowAiSuggest(false)}
            onAddTask={(data) => createMutation.mutate({ ...data, status: 'backlog' })}
            isCreating={createMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* AI Generate Board Modal */}
      <AnimatePresence>
        {showAiKanban && (
          <AiKanbanModal
            projectId={projectId}
            onClose={() => setShowAiKanban(false)}
            onSuccess={() => {
              queryClient.invalidateQueries(['kanban-board', projectId]);
              setShowAiKanban(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            projectId={projectId}
            board={board}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ column, tasks, onAddTask, onTaskClick, onComplete, onDelete, projectId }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { columnId: column.id },
  });

  return (
    <div ref={setNodeRef} style={{
      width: 280, minWidth: 280, display: 'flex', flexDirection: 'column',
      background: isOver ? `${column.color}08` : 'rgba(255,255,255,0.025)',
      border: `1px solid ${isOver ? column.color + '30' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 16, overflow: 'hidden', transition: 'all 0.2s',
    }}>
      {/* Column Header */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${column.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: column.color }} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{column.label}</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '1px 7px', borderRadius: 99, background: `${column.color}20`, color: column.color }}>
            {tasks.length}
          </span>
        </div>
        <button onClick={onAddTask} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)', padding: 4 }} title="Add task">
          <Plus size={14} />
        </button>
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', minHeight: 100 }}>
          {tasks.map(task => (
            <SortableTaskCard key={task._id} task={task} onClick={() => onTaskClick(task)} onComplete={onComplete} onDelete={onDelete} />
          ))}
          {tasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
      <InlineTaskInput columnId={column.id} projectId={projectId} />
    </div>
  );
}

// ─── Inline Task Input ────────────────────────────────────────────────────────
function InlineTaskInput({ columnId, projectId }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleCreate = async (taskData) => {
    if (!taskData.title.trim()) return;
    setLoading(true);
    try {
      await taskAPI.create(projectId, { ...taskData, status: columnId });
      queryClient.invalidateQueries(['kanban-board', projectId]);
      setTitle('');
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleAiEnhance = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await aiAPI.enhanceTask({ title });
      await handleCreate(res.data);
      toast.success('Task enhanced and created!');
    } catch (error) {
      toast.error('AI enhance failed');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        type="text"
        placeholder="Quick add..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCreate({ title })}
        disabled={loading}
        style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
      />
      {title.trim() && (
        <button onClick={handleAiEnhance} disabled={loading} className="btn btn-ghost btn-icon" style={{ color: '#8b5cf6', padding: 4 }} title="AI Auto-fill details">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
        </button>
      )}
    </div>
  );
}

// ─── Sortable Task Card ────────────────────────────────────────────────────────
function SortableTaskCard({ task, onClick, onComplete, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard task={task} onClick={onClick} dragListeners={listeners} dragAttributes={attributes} isDragging={isDragging} onComplete={onComplete} onDelete={onDelete} />
    </div>
  );
}

// ─── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onClick, isDragging, dragListeners, dragAttributes, onComplete, onDelete }) {
  const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <div
      className="task-card"
      onClick={onClick}
      style={{
        background: isDragging ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
        border: isDragging ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
        transition: 'all 0.15s', boxShadow: isDragging ? '0 8px 30px rgba(0,0,0,0.4)' : 'none',
      }}
      onMouseEnter={e => { if (!isDragging) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; } }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
    >
      {/* Drag handle + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div {...dragListeners} {...dragAttributes} style={{ color: 'var(--text-muted)', cursor: 'grab', marginTop: 2, flexShrink: 0 }}>
          <GripVertical size={12} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: task.tags?.length ? 8 : 0 }}>{task.title}</p>

          {/* Tags */}
          {task.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {task.tags.slice(0, 2).map(tag => (
                <span key={tag} style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderRadius: 4 }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: pConfig.color }}>{pConfig.icon}</span>
              {task.due_date && (
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Calendar size={9} /> {format(new Date(task.due_date), 'MMM d')}
                </span>
              )}
              {task.story_points && (
                <span style={{ fontSize: '0.65rem', padding: '1px 5px', background: 'var(--bg-glass-hover)', borderRadius: 4, color: 'var(--text-secondary)' }}>{task.story_points}pt</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div className="task-actions" style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.2s' }}>
                {task.status !== 'completed' && (
                  <button onClick={(e) => { e.stopPropagation(); onComplete(task); }} title="Mark Complete" style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: 2 }}>
                    <CheckCircle2 size={14} />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); onDelete(task); }} title="Delete Task" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}>
                  <Trash2 size={14} />
                </button>
              </div>
              {task.comments?.length > 0 && (
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <MessageSquare size={9} /> {task.comments.length}
                </span>
              )}
              {task.checklist?.length > 0 && (
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CheckSquare size={9} /> {task.checklist.filter(c => c.is_done).length}/{task.checklist.length}
                </span>
              )}
            </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          .task-card:hover .task-actions { opacity: 1 !important; }
        `}} />
      </div>
    </div>
  );
}

// ─── Add Task Panel ────────────────────────────────────────────────────────────
function AddTaskPanel({ columnId, onClose, onSubmit, loading }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [storyPoints, setStoryPoints] = useState('');
  const [dueDate, setDueDate] = useState('');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Add Task to {COLUMNS.find(c => c.id === columnId)?.label}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Task Title *</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus
              onKeyDown={e => e.key === 'Enter' && title.trim() && onSubmit({ title, priority, story_points: storyPoints ? Number(storyPoints) : null, due_date: dueDate || null })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                {Object.entries(PRIORITY_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Story Points</label>
              <input type="number" className="input" value={storyPoints} onChange={e => setStoryPoints(e.target.value)} placeholder="e.g. 3" min={0} max={100} />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={() => onSubmit({ title, priority, story_points: storyPoints ? Number(storyPoints) : null, due_date: dueDate || null })} disabled={!title.trim() || loading} className="btn btn-primary">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Add Task</>}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Task Detail Modal ─────────────────────────────────────────────────────────
function TaskDetailModal({ task, projectId, board, onClose }) {
  const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');

  const commentMutation = useMutation({
    mutationFn: () => taskAPI.addComment(projectId, task._id, { content: comment }),
    onSuccess: () => { setComment(''); queryClient.invalidateQueries(['kanban-board', projectId]); },
  });

  const subtaskMutation = useMutation({
    mutationFn: (title) => taskAPI.create(projectId, { title, parent_task: task._id, type: 'subtask', status: task.status }),
    onSuccess: () => { setNewSubtask(''); queryClient.invalidateQueries(['kanban-board', projectId]); toast.success('Subtask created'); },
  });

  const completeMutation = useMutation({
    mutationFn: () => taskAPI.update(projectId, task._id, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['kanban-board', projectId]);
      toast.success('Task marked as complete');
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => taskAPI.delete(projectId, task._id),
    onSuccess: () => {
      queryClient.invalidateQueries(['kanban-board', projectId]);
      toast.success('Task deleted');
      onClose();
    }
  });

  const aiBreakdownMutation = useMutation({
    mutationFn: () => aiAPI.breakdownTask({ title: task.title, description: task.description }),
    onSuccess: async (res) => {
      if (res.data?.checklist) {
        // Create subtasks sequentially
        for (const item of res.data.checklist) {
          await taskAPI.create(projectId, { title: item.title, parent_task: task._id, type: 'subtask', status: task.status });
        }
        queryClient.invalidateQueries(['kanban-board', projectId]);
        toast.success('Task broken down by AI!');
      }
    },
    onError: () => toast.error('Failed to break down task with AI')
  });

  const allTasks = Object.values(board || {}).flat();
  const subtasks = allTasks.filter(t => t.parent_task === task._id);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: pConfig.color }}>{pConfig.icon} {pConfig.label} Priority</span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--bg-glass-hover)', borderRadius: 6, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{task.type}</span>
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{task.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={() => aiBreakdownMutation.mutate()} disabled={aiBreakdownMutation.isPending} className="btn btn-secondary btn-sm" style={{ color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.3)', padding: '6px 10px' }}>
              {aiBreakdownMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} AI Breakdown
            </button>
            {task.status !== 'completed' && (
              <button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending} className="btn btn-secondary btn-sm" style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)', padding: '6px 10px' }}>
                {completeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Complete
              </button>
            )}
            <button onClick={() => { if(window.confirm('Are you sure you want to delete this task?')) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} className="btn btn-ghost btn-sm" style={{ color: '#ef4444', padding: '6px 10px' }}>
              {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div style={{ marginBottom: 20 }}>
            <label className="label">Description</label>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{task.description}</p>
          </div>
        )}

        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Status', value: task.status?.replace('_', ' '), color: '#6366f1' },
            { label: 'Priority', value: `${pConfig.icon} ${pConfig.label}`, color: pConfig.color },
            task.story_points && { label: 'Story Points', value: `${task.story_points}pt` },
            task.due_date && { label: 'Due Date', value: format(new Date(task.due_date), 'MMM d, yyyy') },
          ].filter(Boolean).map(meta => (
            <div key={meta.label} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}>{meta.label}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: meta.color || '#f8fafc', textTransform: 'capitalize' }}>{meta.value}</div>
            </div>
          ))}
        </div>

        {/* Checklist */}
        {task.checklist?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label className="label">Checklist ({task.checklist.filter(c => c.is_done).length}/{task.checklist.length})</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {task.checklist.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 8 }}>
                  <CheckSquare size={14} style={{ color: item.is_done ? '#10b981' : '#475569' }} />
                  <span style={{ fontSize: '0.85rem', color: item.is_done ? '#64748b' : '#f8fafc', textDecoration: item.is_done ? 'line-through' : 'none' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subtasks (Subtree Forming) */}
        <div style={{ marginBottom: 20 }}>
          <label className="label">Subtasks ({subtasks.length})</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {subtasks.map(st => (
              <div key={st._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_CONFIG[st.priority]?.color || '#6366f1' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', flex: 1, textDecoration: st.status === 'completed' ? 'line-through' : 'none' }}>{st.title}</span>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--bg-glass)', borderRadius: 6, color: 'var(--text-muted)' }}>{st.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Add a subtask..." style={{ flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && newSubtask.trim() && subtaskMutation.mutate(newSubtask)} />
            <button onClick={() => newSubtask.trim() && subtaskMutation.mutate(newSubtask)} className="btn btn-secondary btn-sm" disabled={!newSubtask.trim() || subtaskMutation.isPending}>
              {subtaskMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
            </button>
          </div>
        </div>

        {/* Comments */}
        <div>
          <label className="label">Comments ({task.comments?.length || 0})</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {task.comments?.map((c, i) => (
              <div key={i} style={{ background: 'var(--bg-glass)', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 4 }}>{c.content}</p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." style={{ flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && comment.trim() && commentMutation.mutate()} />
            <button onClick={() => comment.trim() && commentMutation.mutate()} className="btn btn-primary btn-sm" disabled={!comment.trim()}>Post</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
// ─── AI Suggest Tasks Modal ───────────────────────────────────────────────────
function AiSuggestTasksModal({ projectId, onClose, onAddTask, isCreating }) {
  const [teamSize, setTeamSize] = useState(1);
  const [suggestions, setSuggestions] = useState(null);

  const suggestMutation = useMutation({
    mutationFn: () => aiAPI.suggestTasks({ projectId, teamSize }),
    onSuccess: (res) => {
      setSuggestions(res.data.suggestions);
    },
    onError: () => toast.error('Failed to get AI suggestions')
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, background: 'rgba(99,102,241,0.15)', borderRadius: 8, color: '#818cf8' }}>
              <Sparkles size={18} />
            </div>
            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.2rem' }}>AI Task Suggestions</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        {!suggestions ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              DevPilot AI will analyze your project description and existing backlog to suggest new, relevant tasks to keep your project moving forward.
            </p>
            <div>
              <label className="label">Team Size (affects number of tasks)</label>
              <input type="number" className="input" value={teamSize} onChange={e => setTeamSize(e.target.value)} min={1} max={50} />
            </div>
            <button 
              onClick={() => suggestMutation.mutate()} 
              disabled={suggestMutation.isPending} 
              className="btn btn-primary" 
              style={{ alignSelf: 'flex-start', marginTop: 10 }}
            >
              {suggestMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Generate Suggestions
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 8 }}>
              AI has suggested {suggestions.length} tasks. Click 'Add to Backlog' for tasks you want to keep.
            </p>
            {suggestions.map((task, i) => (
              <div key={i} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: 6 }}>{task.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10 }}>{task.description}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: 4, textTransform: 'capitalize' }}>{task.type}</span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: 4, textTransform: 'capitalize' }}>{task.priority} Priority</span>
                      {task.story_points && <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', borderRadius: 4 }}>{task.story_points} pts</span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      onAddTask(task);
                      // Remove from list visually
                      setSuggestions(s => s.filter((_, idx) => idx !== i));
                    }} 
                    disabled={isCreating}
                    className="btn btn-secondary btn-sm" 
                    style={{ flexShrink: 0, padding: '6px 12px' }}
                  >
                    {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add to Backlog
                  </button>
                </div>
              </div>
            ))}
            {suggestions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                No more suggestions.
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
// ─── AI Kanban Generator Modal ────────────────────────────────────────────────
function AiKanbanModal({ projectId, onClose, onSuccess }) {
  const [prompt, setPrompt] = useState('');
  const [preview, setPreview] = useState(null);
  const [step, setStep] = useState('input'); // 'input' | 'preview'
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);

  const COLUMN_COLORS = {
    backlog: 'var(--text-muted)',
    todo: '#3b82f6',
    in_progress: '#f59e0b',
    review: '#8b5cf6',
    testing: '#06b6d4',
    completed: '#10b981',
  };
  const PRIORITY_BADGE = {
    critical: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    high: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    medium: { bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
    low: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await aiAPI.generateKanban({ prompt, projectId });
      setPreview(res.data);
      setStep('preview');
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleCommit = async () => {
    if (!preview) return;
    // If preview already committed tasks (because projectId was sent), just close
    if (preview.tasks_created !== undefined) {
      toast.success(`✨ Board generated! ${preview.tasks_created} tasks added.`);
      onSuccess();
      return;
    }
    // Fallback: commit manually (shouldn't happen with projectId)
    setCommitting(true);
    try {
      const res = await aiAPI.generateKanban({ prompt, projectId });
      toast.success(`✨ ${res.data.tasks_created} tasks added to your board!`);
      onSuccess();
    } catch (err) {
      toast.error('Failed to add tasks');
    } finally {
      setCommitting(false);
    }
  };

  const totalTasks = preview?.board?.columns?.reduce((acc, col) => acc + (col.tasks?.length || 0), 0) || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale: 0.93, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(168,85,247,0.25)',
          borderRadius: 24,
          width: '100%',
          maxWidth: step === 'preview' ? 880 : 560,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'max-width 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid rgba(168,85,247,0.15)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
              }}>
                <BrainCircuit size={22} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                  AI Board Generator
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {step === 'input' ? 'Describe your project and AI will build a professional Kanban board' : `Preview · ${totalTasks} tasks across ${preview?.board?.columns?.length || 0} columns`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
          </div>

          {step === 'preview' && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, padding: '10px 14px', background: 'rgba(168,85,247,0.08)', borderRadius: 10, border: '1px solid rgba(168,85,247,0.2)' }}>
                <p style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600, marginBottom: 2 }}>Your prompt</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{prompt}</p>
              </div>
              <button onClick={() => { setStep('input'); setPreview(null); }}
                className="btn btn-secondary btn-sm" style={{ flexShrink: 0, gap: 6, fontSize: '0.78rem' }}>
                <Wand2 size={13} /> Try Again
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {step === 'input' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Example prompts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick examples</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    'Build an e-commerce mobile app',
                    'Launch a SaaS product MVP',
                    'Migrate monolith to microservices',
                    'Build a real-time dashboard',
                  ].map(ex => (
                    <button key={ex} onClick={() => setPrompt(ex)}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: '0.75rem',
                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                        color: '#a5b4fc', cursor: 'pointer', transition: 'all 0.15s',
                        fontWeight: 500,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                    >{ex}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label className="label">Describe your project or goal</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="e.g. Build a food delivery app with real-time order tracking, driver management, restaurant dashboard, and customer reviews..."
                  autoFocus
                  rows={5}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
                  style={{
                    resize: 'vertical', minHeight: 120,
                    padding: '12px 16px', borderRadius: 12,
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(168,85,247,0.25)',
                    color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(168,85,247,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(168,85,247,0.25)'}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tip: Be specific — mention features, tech stack, team size. Press Ctrl+Enter to generate.</p>
              </div>

              <div style={{
                padding: '14px 16px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 12,
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <BrainCircuit size={20} style={{ color: '#818cf8', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#a5b4fc', marginBottom: 4 }}>What AI will generate</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    12–20 professional tasks across Backlog, To Do, In Progress, Review, and Completed columns — each with title, description, priority, story points, type, and tags. All tasks will be created in your project immediately.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Preview grid
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {preview?.board?.description && (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '3px solid rgba(168,85,247,0.5)', paddingLeft: 12 }}>
                  {preview.board.description}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(preview?.board?.columns || []).filter(col => (col.tasks?.length || 0) > 0).map(col => {
                  const colColor = COLUMN_COLORS[col.id] || '#6366f1';
                  return (
                    <div key={col.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: colColor }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{col.label || col.id.replace('_', ' ')}</span>
                        <span style={{ fontSize: '0.7rem', padding: '1px 8px', borderRadius: 99, background: `${colColor}18`, color: colColor, fontWeight: 600 }}>{col.tasks?.length}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                        {(col.tasks || []).map((task, i) => {
                          const pr = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium;
                          return (
                            <div key={i} style={{
                              background: 'rgba(255,255,255,0.035)',
                              border: '1px solid rgba(255,255,255,0.07)',
                              borderRadius: 12, padding: '12px 14px',
                              display: 'flex', flexDirection: 'column', gap: 8,
                            }}>
                              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{task.title}</p>
                              {task.description && (
                                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{task.description}</p>
                              )}
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 'auto' }}>
                                <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 20, background: pr.bg, color: pr.color, fontWeight: 600 }}>{task.priority}</span>
                                {task.story_points && <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>{task.story_points}pt</span>}
                                {task.type && <span style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{task.type}</span>}
                                {(task.tags || []).slice(0, 2).map(tag => (
                                  <span key={tag} style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.07)' }}>{tag}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          background: 'rgba(0,0,0,0.1)',
          flexShrink: 0,
        }}>
          {step === 'input' ? (
            <>
              <button onClick={onClose} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  border: 'none', color: '#fff',
                  boxShadow: generating ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                  opacity: !prompt.trim() || generating ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {generating ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><BrainCircuit size={16} /> Generate Board</>}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="btn btn-secondary">Discard</button>
              <button
                onClick={handleCommit}
                disabled={committing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 22px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none', color: '#fff',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                  transition: 'all 0.2s',
                }}
              >
                {committing ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Adding…</> : <><CheckCircle2 size={16} /> Apply to Board ({totalTasks} tasks)</>}
              </button>
            </>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    </motion.div>
  );
}
