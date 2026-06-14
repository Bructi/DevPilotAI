const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

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
router.post('/chat', async (req, res) => {
  try {
    const { messages, project_context, context_type } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }
    const data = await proxyToAI('/chat', { messages, project_context, context_type });
    res.json(data);
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ error: err.message || 'AI chat failed' });
  }
});

// ─── Sprint Planning ──────────────────────────────────────────────────────────
router.post('/sprint/plan', async (req, res) => {
  try {
    const data = await proxyToAI('/sprint/plan', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Sprint planning failed' });
  }
});

// ─── Document Generation ──────────────────────────────────────────────────────
router.post('/documents/generate', async (req, res) => {
  try {
    const data = await proxyToAI('/documents/generate', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Document generation failed' });
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

