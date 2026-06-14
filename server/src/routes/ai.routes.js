const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { AiConversation, Document, Sprint, ActivityLog } = require('../models/mongo/index');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// ─── Proxy helper ─────────────────────────────────────────────────────────────
const proxyToAI = async (endpoint, body) => {
  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
  const response = await fetch(`${AI_ENGINE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'AI engine error' }));
    throw new Error(err.detail || 'AI engine request failed');
  }
  return response.json();
};

// ─── AI Engine Health (public) ─────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
    const response = await fetch(`${AI_ENGINE_URL}/health`);
    const data = await response.json();
    res.json({ ...data, proxy: 'server', ai_engine_url: AI_ENGINE_URL });
  } catch (err) {
    res.status(503).json({ status: 'unavailable', error: 'AI engine is not running', ai_engine_url: AI_ENGINE_URL });
  }
});

// All other AI routes require authentication
router.use(authenticate);

// ─── Chat ─────────────────────────────────────────────────────────────────────
router.get('/conversations/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const conversations = await AiConversation.find({ 
      project_id: projectId,
      user_id: req.user.userId,
      is_archived: false 
    }).sort('-updatedAt');
    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { messages, project_context, context_type, project_id, conversation_id } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }
    
    const data = await proxyToAI('/chat', { messages, project_context, context_type });
    
    // Save to DB
    let conversation;
    if (conversation_id) {
      conversation = await AiConversation.findById(conversation_id);
    }
    
    if (!conversation && project_id) {
      conversation = new AiConversation({
        project_id,
        user_id: req.user.userId,
        title: messages[messages.length - 1]?.content.substring(0, 30) + '...',
        context_type: context_type || 'general',
        messages: []
      });
    }

    if (conversation) {
      // Append the latest user message and the assistant response
      const userMessage = messages[messages.length - 1];
      if (userMessage.role === 'user') {
        conversation.messages.push({
          role: 'user',
          content: userMessage.content,
          timestamp: new Date()
        });
      }
      
      conversation.messages.push({
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        metadata: { model: data.model }
      });
      
      await conversation.save();
    }
    
    res.json({ ...data, conversation_id: conversation?._id });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ error: err.message || 'AI chat failed' });
  }
});

// ─── Sprint Planning ──────────────────────────────────────────────────────────
router.post('/sprint/plan', async (req, res) => {
  try {
    const data = await proxyToAI('/sprint/plan', req.body);
    
    if (req.body.project_id) {
      const newSprint = await Sprint.create({
        project_id: req.body.project_id,
        name: `Sprint ${new Date().toISOString().split('T')[0]}`,
        status: 'planned',
        start_date: new Date(),
        end_date: new Date(Date.now() + (req.body.sprint_duration_weeks * 7 * 24 * 60 * 60 * 1000)),
        ai_plan: {
          suggestions: data.sprint_plan.split('\n').filter(l => l.trim()),
          generated_at: new Date()
        }
      });
      
      await ActivityLog.create({
        project_id: req.body.project_id,
        user_id: req.user.userId,
        action: `Generated AI Sprint Plan`,
        entity_type: 'sprint',
        entity_id: newSprint._id.toString()
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Sprint planning failed' });
  }
});

// ─── Document Generation ──────────────────────────────────────────────────────
router.get('/documents/:projectId', async (req, res) => {
  try {
    const documents = await Document.find({ 
      project_id: req.params.projectId, 
      is_deleted: false 
    }).sort('-createdAt');
    res.json({ documents });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.post('/documents/generate', async (req, res) => {
  try {
    const data = await proxyToAI('/documents/generate', req.body);
    
    if (req.body.project_id) {
      const doc = await Document.create({
        project_id: req.body.project_id,
        created_by: req.user.userId,
        title: `${req.body.doc_type.toUpperCase()} - ${req.body.project_name}`,
        type: req.body.doc_type,
        content: data.document,
        is_ai_generated: true,
      });
      
      await ActivityLog.create({
        project_id: req.body.project_id,
        user_id: req.user.userId,
        action: `Generated Document "${doc.title}"`,
        entity_type: 'ai',
        entity_id: doc._id.toString()
      });
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Document generation failed' });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    await Document.findByIdAndUpdate(req.params.id, { is_deleted: true });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ─── Task Breakdown ───────────────────────────────────────────────────────────
router.post('/tasks/breakdown', async (req, res) => {
  try {
    const data = await proxyToAI('/tasks/breakdown', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Task breakdown failed' });
  }
});

// ─── Code Review ──────────────────────────────────────────────────────────────
router.post('/code/review', async (req, res) => {
  try {
    const data = await proxyToAI('/code/review', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Code review failed' });
  }
});

module.exports = router;
