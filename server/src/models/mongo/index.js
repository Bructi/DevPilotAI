const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  name: { type: String, required: true, trim: true },
  goal: { type: String, maxlength: 1000, default: '' },
  status: { type: String, enum: ['planned', 'active', 'completed', 'cancelled'], default: 'planned' },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  total_story_points: { type: Number, default: 0 },
  completed_story_points: { type: Number, default: 0 },
  velocity: { type: Number, default: 0 },
  ai_plan: {
    suggestions: [{ type: String }],
    risk_warnings: [{ type: String }],
    team_allocation: { type: mongoose.Schema.Types.Mixed, default: {} },
    generated_at: { type: Date, default: null },
  },
  retrospective: {
    went_well: [{ type: String }],
    to_improve: [{ type: String }],
    action_items: [{ type: String }],
  },
  burndown_data: [{
    date: Date,
    remaining_points: Number,
    completed_points: Number,
  }],
  is_deleted: { type: Boolean, default: false },
}, { timestamps: true });

// Chat Message
const chatMessageSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
  team_id: { type: String, index: true },
  channel: { type: String, default: 'general' },
  sender_id: { type: String, required: true },
  content: { type: String, required: true, maxlength: 5000 },
  type: { type: String, enum: ['text', 'file', 'image', 'system', 'ai'], default: 'text' },
  attachments: [{ name: String, url: String, type: String, size: Number }],
  mentions: [{ type: String }],
  reply_to: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage', default: null },
  reactions: [{ emoji: String, users: [String] }],
  is_edited: { type: Boolean, default: false },
  edited_at: { type: Date, default: null },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: true });

// Notification
const notificationSchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['task_assigned', 'task_updated', 'deadline', 'sprint_start', 'sprint_end',
           'mention', 'comment', 'code_review', 'pr_merged', 'team_invite', 'system', 'chat_message'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  is_read: { type: Boolean, default: false, index: true },
  action_url: { type: String, default: null },
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  from_user_id: { type: String, default: null },
}, { timestamps: true });

// Activity Log
const activityLogSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
  user_id: { type: String, required: true },
  action: { type: String, required: true },
  entity_type: { type: String, enum: ['project', 'task', 'sprint', 'member', 'comment', 'file', 'ai'] },
  entity_id: { type: String, default: null },
  entity_name: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip_address: { type: String, default: null },
}, { timestamps: true });

// AI Conversation
const aiConversationSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  user_id: { type: String, required: true, index: true },
  title: { type: String, default: 'New Conversation' },
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    tokens_used: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  }],
  context_type: { type: String, enum: ['general', 'sprint_planning', 'code_review', 'documentation', 'analysis'], default: 'general' },
  is_archived: { type: Boolean, default: false },
}, { timestamps: true });

// Document (AI-generated)
const documentSchema = new mongoose.Schema({
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  created_by: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['srs', 'technical', 'api_docs', 'user_manual', 'readme', 'deployment', 'custom'], required: true },
  content: { type: String, required: true },
  format: { type: String, enum: ['markdown', 'html', 'pdf', 'docx'], default: 'markdown' },
  version: { type: Number, default: 1 },
  is_ai_generated: { type: Boolean, default: false },
  tags: [{ type: String }],
  is_published: { type: Boolean, default: false },
  is_deleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = {
  Sprint: mongoose.model('Sprint', sprintSchema),
  ChatMessage: mongoose.model('ChatMessage', chatMessageSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  ActivityLog: mongoose.model('ActivityLog', activityLogSchema),
  AiConversation: mongoose.model('AiConversation', aiConversationSchema),
  Document: mongoose.model('Document', documentSchema),
};
