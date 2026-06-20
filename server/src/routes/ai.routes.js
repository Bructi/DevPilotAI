const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { AiConversation, Document, Sprint, ActivityLog } = require('../models/mongo/index');
const Task = require('../models/mongo/Task.model');
const Project = require('../models/mongo/Project.model');
const UserModel = require('../models/sqlite/User.model');


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

// ─── Task Suggestion ──────────────────────────────────────────────────────────
router.post('/tasks/suggest', authenticate, async (req, res) => {
  try {
    const { projectId, teamSize } = req.body;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    const existingTasks = await Task.find({ project_id: projectId }).limit(50);
    
    const reqBody = {
      project_name: project.name,
      project_description: project.description,
      existing_tasks: existingTasks.map(t => t.title),
      team_size: teamSize || 1
    };

    const data = await proxyToAI('/tasks/suggest', reqBody);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Task suggestion failed' });
  }
});

// ─── Project Planning ─────────────────────────────────────────────────────────
router.post('/project/plan', authenticate, async (req, res) => {
  try {
    const data = await proxyToAI('/project/plan', req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Project planning failed' });
  }
});

// ─── Sprint Retrospective ─────────────────────────────────────────────────────
router.post('/sprint/retrospective', authenticate, async (req, res) => {
  try {
    const { sprintId } = req.body;
    let sprintName = req.body.sprint_name || 'Sprint';
    let completedPoints = req.body.completed_points || 0;
    let totalPoints = req.body.total_points || 0;
    let tasksCompleted = req.body.tasks_completed || [];
    let tasksMissed = req.body.tasks_missed || [];
    let durationWeeks = req.body.duration_weeks || 2;

    if (sprintId) {
      const sprint = await Sprint.findById(sprintId);
      if (sprint) {
        sprintName = sprint.name;
        completedPoints = sprint.completed_story_points;
        totalPoints = sprint.total_story_points;
        const start = new Date(sprint.start_date);
        const end = new Date(sprint.end_date);
        durationWeeks = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 7)));

        const tasks = await Task.find({ sprint_id: sprintId });
        tasksCompleted = tasks.filter(t => t.status === 'completed').map(t => t.title);
        tasksMissed = tasks.filter(t => t.status !== 'completed').map(t => t.title);
      }
    }

    const data = await proxyToAI('/sprint/retrospective', {
      sprint_name: sprintName,
      completed_points: completedPoints,
      total_points: totalPoints,
      duration_weeks: durationWeeks,
      tasks_completed: tasksCompleted,
      tasks_missed: tasksMissed
    });
    
    // Auto-save to sprint if sprintId provided
    if (sprintId) {
      await Sprint.findByIdAndUpdate(sprintId, {
        'retrospective.action_items': data.retrospective.split('\n').filter(l => l.trim().startsWith('- ')),
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Sprint retrospective failed' });
  }
});

// ─── GitHub Analysis ──────────────────────────────────────────────────────────
router.post('/github/analyze', authenticate, async (req, res) => {
  try {
    const { repoFullName, projectId } = req.body;
    const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
    
    const user = await UserModel.findByPk(req.user.userId, { attributes: ['github_pat'] });
    if (!user || !user.github_pat) {
      return res.status(400).json({ error: 'GitHub is not connected' });
    }

    const headers = { 
      Authorization: `Bearer ${user.github_pat}`, 
      'User-Agent': 'DevPilot-AI', 
      Accept: 'application/vnd.github+json' 
    };

    const [repoRes, commitsRes, issuesRes, prsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repoFullName}`, { headers }),
      fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=5`, { headers }),
      fetch(`https://api.github.com/repos/${repoFullName}/issues?state=open&per_page=5`, { headers }),
      fetch(`https://api.github.com/repos/${repoFullName}/pulls?state=open&per_page=5`, { headers })
    ]);

    const repoInfo = repoRes.ok ? await repoRes.json() : {};
    const commits = commitsRes.ok ? await commitsRes.json() : [];
    const issues = issuesRes.ok ? await issuesRes.json() : [];
    const prs = prsRes.ok ? await prsRes.json() : [];

    // GitHub API returns PRs inside the issues endpoint, so we filter them out
    const pureIssues = issues.filter(i => !i.pull_request);

    const commitsText = Array.isArray(commits) ? commits.map(c => `- ${c.commit.message.split('\n')[0]} (by ${c.commit.author?.name || 'unknown'})`).join('\n') : '';
    const issuesText = pureIssues.map(i => `- Issue #${i.number}: ${i.title} [${i.labels?.map(l => l.name).join(', ') || ''}]`).join('\n');
    const prsText = prs.map(p => `- PR #${p.number}: ${p.title} (by ${p.user?.login || 'unknown'})`).join('\n');

    const prompt = `Analyze this GitHub repository: **${repoFullName}**

**Repository Information:**
- Description: ${repoInfo.description || 'No description'}
- Primary Language: ${repoInfo.language || 'Unknown'}
- Stars: ${repoInfo.stargazers_count || 0}
- Total Open Issues: ${repoInfo.open_issues_count || 0}
- Last Updated: ${repoInfo.updated_at ? new Date(repoInfo.updated_at).toLocaleString() : 'Unknown'}

**Recent Commits:**
${commitsText || 'No recent commits.'}

**Recent Open Issues:**
${issuesText || 'No open issues.'}

**Recent Open PRs:**
${prsText || 'No open PRs.'}

Based on this real data:
1. Provide a brief health summary of the repository.
2. Analyze recent commit activity to understand what is currently being worked on.
3. Suggest 3-5 specific, actionable tasks the team should focus on next (based on issues, PRs, or logical next steps from commits).
Format the output in clean Markdown.`;

    const data = await proxyToAI('/chat', {
      messages: [{ role: 'user', content: prompt }],
      context_type: 'analysis'
    });

    res.json({ analysis: data.content || data.reply });
  } catch (err) {
    res.status(500).json({ error: err.message || 'GitHub analysis failed' });
  }
});

// ─── Smart Sprint Planning ────────────────────────────────────────────────────
router.post('/sprint/smart-plan', authenticate, async (req, res) => {
  try {
    const { projectId, teamSize, durationWeeks } = req.body;
    
    // Fetch project and backlog tasks
    const project = await Project.findById(projectId);
    const backlogTasks = await Task.find({ project_id: projectId, status: { $in: ['backlog', 'todo'] } })
      .sort({ priority: -1 })
      .limit(30);
      
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const tasksList = backlogTasks.map(t => `- [${t.priority.toUpperCase()}] ${t.title} (Est: ${t.story_points || '?'})`).join('\n');

    const reqBody = {
      project_name: project.name,
      project_description: project.description,
      duration_weeks: durationWeeks || 2,
      team_size: teamSize || 1,
      velocity: 0,
      tasks: tasksList
    };

    const data = await proxyToAI('/sprint/plan', reqBody);
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Smart sprint planning failed' });
  }
});

// ─── Task Enhance ─────────────────────────────────────────────────────────────
router.post('/tasks/enhance', authenticate, async (req, res) => {
  try {
    const data = await proxyToAI('/tasks/enhance', { title: req.body.title });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Task enhance failed' });
  }
});

// ─── Task Breakdown ───────────────────────────────────────────────────────────
router.post('/tasks/breakdown', authenticate, async (req, res) => {
  try {
    const data = await proxyToAI('/tasks/generate-subtasks', { title: req.body.title, description: req.body.description });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Task breakdown failed' });
  }
});

// ─── AI Kanban Board Generator ────────────────────────────────────────────────
router.post('/kanban/generate', authenticate, async (req, res) => {
  try {
    const { prompt, projectId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Get project name for context if available
    let projectName = null;
    if (projectId) {
      const project = await Project.findById(projectId).catch(() => null);
      projectName = project?.name || null;
    }

    const data = await proxyToAI('/kanban/generate', {
      prompt,
      project_name: projectName,
      use_ai: true,
    });

    // If projectId given, bulk-create all the tasks in MongoDB
    if (projectId && data.board?.columns) {
      // Valid enums from Task.model.js
      const VALID_STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'testing', 'completed'];
      const VALID_TYPES = ['task', 'story', 'bug', 'epic', 'subtask'];
      const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
      // Map AI-generated types to schema-valid types
      const TYPE_MAP = { feature: 'story', research: 'task', chore: 'task', enhancement: 'story' };

      const createdTasks = [];
      const errors = [];

      for (const col of data.board.columns) {
        const status = VALID_STATUSES.includes(col.id) ? col.id : 'backlog';
        for (const task of (col.tasks || [])) {
          try {
            const rawType = (task.type || 'task').toLowerCase();
            const type = VALID_TYPES.includes(rawType) ? rawType : (TYPE_MAP[rawType] || 'task');
            const priority = VALID_PRIORITIES.includes(task.priority) ? task.priority : 'medium';

            const created = await Task.create({
              project_id: projectId,
              reporter_id: req.user.userId,   // ← required field
              title: task.title,
              description: task.description || '',
              priority,
              story_points: task.story_points || null,
              type,
              tags: (task.tags || []).map(t => String(t).trim()).filter(Boolean),
              status,
            });
            createdTasks.push(created);
          } catch (taskErr) {
            errors.push({ task: task.title, error: taskErr.message });
            console.error(`Failed to create task "${task.title}":`, taskErr.message);
          }
        }
      }

      await ActivityLog.create({
        project_id: projectId,
        user_id: req.user.userId,
        action: `Generated AI Kanban board: "${data.board.board_title}" (${createdTasks.length} tasks)`,
        entity_type: 'ai',
        entity_id: projectId,
      }).catch(() => {});

      return res.json({ board: data.board, prompt, tasks_created: createdTasks.length, errors });
    }

    // Return preview only (no projectId)
    res.json({ board: data.board, prompt });
  } catch (err) {
    console.error('AI Kanban generation error:', err.message);
    res.status(500).json({ error: err.message || 'Kanban generation failed' });
  }
});


module.exports = router;

