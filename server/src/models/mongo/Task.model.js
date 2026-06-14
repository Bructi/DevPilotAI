const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  sprint_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },

  title: { type: String, required: true, trim: true, maxlength: 500 },
  description: { type: String, maxlength: 5000, default: '' },
  type: { type: String, enum: ['task', 'story', 'bug', 'epic', 'subtask'], default: 'task' },

  status: {
    type: String,
    enum: ['backlog', 'todo', 'in_progress', 'review', 'testing', 'completed'],
    default: 'backlog',
    index: true,
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

  assignees: [{ type: String }], // MySQL user UUIDs
  reporter_id: { type: String, required: true },

  story_points: { type: Number, default: null, min: 0, max: 100 },
  estimated_hours: { type: Number, default: null },
  logged_hours: { type: Number, default: 0 },

  due_date: { type: Date, default: null },
  start_date: { type: Date, default: null },
  completed_at: { type: Date, default: null },

  tags: [{ type: String, trim: true }],
  labels: [{ type: String, trim: true }],

  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  parent_task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  subtasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],

  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploaded_by: String,
    uploaded_at: { type: Date, default: Date.now },
  }],

  comments: [{
    author_id: { type: String, required: true },
    content: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    is_edited: { type: Boolean, default: false },
    edited_at: { type: Date, default: null },
    reactions: [{ emoji: String, users: [String] }],
  }],

  checklist: [{
    text: { type: String, required: true },
    is_done: { type: Boolean, default: false },
    completed_by: { type: String, default: null },
    completed_at: { type: Date, default: null },
  }],

  kanban_order: { type: Number, default: 0 },

  ai_metadata: {
    complexity: { type: String, enum: ['simple', 'moderate', 'complex'], default: null },
    suggested_assignee: { type: String, default: null },
    risk_flag: { type: Boolean, default: false },
    ai_description: { type: String, default: null },
  },

  is_archived: { type: Boolean, default: false },
  is_deleted: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

taskSchema.index({ project_id: 1, status: 1 });
taskSchema.index({ project_id: 1, sprint_id: 1 });
taskSchema.index({ assignees: 1 });

module.exports = mongoose.model('Task', taskSchema);
