const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 2000, default: '' },
  short_description: { type: String, maxlength: 300, default: '' },
  cover_image: { type: String, default: null },
  icon: { type: String, default: '🚀' },
  color: { type: String, default: '#6366f1' },

  owner_id: { type: String, required: true }, // MySQL user UUID
  team_id: { type: String, default: null },
  members: [{
    user_id: { type: String, required: true },
    role: { type: String, enum: ['admin', 'project_manager', 'developer', 'tester', 'viewer'], default: 'developer' },
    joined_at: { type: Date, default: Date.now },
  }],

  status: {
    type: String,
    enum: ['planning', 'development', 'testing', 'deployment', 'maintenance', 'completed', 'paused', 'cancelled'],
    default: 'planning',
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  category: {
    type: String,
    enum: ['web', 'mobile', 'api', 'ml_ai', 'devops', 'data', 'desktop', 'other'],
    default: 'web',
  },
  tags: [{ type: String, trim: true }],

  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  deadline: { type: Date, default: null },

  milestones: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    due_date: { type: Date },
    is_completed: { type: Boolean, default: false },
    completed_at: { type: Date, default: null },
    color: { type: String, default: '#6366f1' },
  }],

  tech_stack: [{ type: String }],
  repository_url: { type: String, default: null },
  github_repo: {
    full_name: { type: String, default: null },   // e.g. "owner/repo"
    url: { type: String, default: null },
    clone_url: { type: String, default: null },
    default_branch: { type: String, default: null },
    is_private: { type: Boolean, default: false },
    is_fork: { type: Boolean, default: false },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    language: { type: String, default: null },
    topics: [{ type: String }],
    connected: { type: Boolean, default: true },
    // legacy fields kept for backward compat
    owner: { type: String, default: null },
    repo: { type: String, default: null },
  },
  deployment_url: { type: String, default: null },

  settings: {
    is_public: { type: Boolean, default: false },
    allow_guest_view: { type: Boolean, default: false },
    sprint_duration: { type: Number, default: 14 }, // days
    working_days: { type: [Number], default: [1, 2, 3, 4, 5] },
    story_points_enabled: { type: Boolean, default: true },
  },

  ai_metadata: {
    complexity: { type: String, enum: ['simple', 'moderate', 'complex', 'enterprise'], default: 'moderate' },
    estimated_hours: { type: Number, default: null },
    risk_level: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    ai_summary: { type: String, default: null },
    last_analyzed: { type: Date, default: null },
  },

  progress: {
    total_tasks: { type: Number, default: 0 },
    completed_tasks: { type: Number, default: 0 },
    completion_percentage: { type: Number, default: 0 },
  },

  is_archived: { type: Boolean, default: false },
  is_deleted: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

projectSchema.index({ owner_id: 1, is_deleted: 1 });
projectSchema.index({ 'members.user_id': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ tags: 1 });

module.exports = mongoose.model('Project', projectSchema);
