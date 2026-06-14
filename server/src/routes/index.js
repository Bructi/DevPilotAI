// Stub routes - will be implemented in Phase 2/3
const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');

// Sprint Routes - mounted at /api/sprints
const sprintRouter = express.Router();
sprintRouter.use(authenticate);
const { Sprint } = require('../models/mongo/index');

sprintRouter.get('/:projectId', async (req, res) => {
  try {
    const sprints = await Sprint.find({ project_id: req.params.projectId, is_deleted: false }).sort('-createdAt');
    res.json({ sprints });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
sprintRouter.post('/:projectId', async (req, res) => {
  try {
    const sprint = await Sprint.create({ ...req.body, project_id: req.params.projectId });
    res.status(201).json({ sprint });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
sprintRouter.put('/:projectId/:sprintId', async (req, res) => {
  try {
    const sprint = await Sprint.findByIdAndUpdate(req.params.sprintId, req.body, { new: true });
    res.json({ sprint });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Team Routes
const teamRouter = express.Router();
teamRouter.use(authenticate);
const { Team, TeamMember } = require('../models/mysql/index');
const User = require('../models/mysql/User.model');

teamRouter.get('/', async (req, res) => {
  const teams = await Team.findAll({ where: { owner_id: req.user.userId, is_active: true } });
  res.json({ teams });
});
teamRouter.post('/', async (req, res) => {
  const team = await Team.create({ ...req.body, owner_id: req.user.userId });
  await TeamMember.create({ team_id: team.id, user_id: req.user.userId, role: 'owner' });
  res.status(201).json({ team });
});
teamRouter.get('/:teamId/members', async (req, res) => {
  const members = await TeamMember.findAll({ where: { team_id: req.params.teamId } });
  res.json({ members });
});
teamRouter.post('/:teamId/members', async (req, res) => {
  const member = await TeamMember.create({ team_id: req.params.teamId, user_id: req.body.user_id });
  res.status(201).json({ member });
});

// Chat Routes
const chatRouter = express.Router({ mergeParams: true });
chatRouter.use(authenticate);
const { ChatMessage } = require('../models/mongo/index');

chatRouter.get('/:projectId', async (req, res) => {
  const { channel = 'general', page = 1, limit = 50 } = req.query;
  const messages = await ChatMessage.find({ project_id: req.params.projectId, channel, is_deleted: false })
    .sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)).lean();
  res.json({ messages: messages.reverse() });
});
chatRouter.post('/:projectId', async (req, res) => {
  const message = await ChatMessage.create({
    ...req.body,
    project_id: req.params.projectId,
    sender_id: req.user.userId,
  });
  const io = req.app.get('io');
  io?.to(`project:${req.params.projectId}:chat`).emit('chat:message', { message });
  res.status(201).json({ message });
});

// Notification Routes
const notificationRouter = express.Router();
notificationRouter.use(authenticate);
const { Notification } = require('../models/mongo/index');

notificationRouter.get('/', async (req, res) => {
  const { page = 1, limit = 30, unread_only } = req.query;
  const filter = { user_id: req.user.userId };
  if (unread_only === 'true') filter.is_read = false;
  const [notifications, unread_count] = await Promise.all([
    Notification.find(filter).sort('-createdAt').skip((page-1)*limit).limit(Number(limit)),
    Notification.countDocuments({ user_id: req.user.userId, is_read: false }),
  ]);
  res.json({ notifications, unread_count });
});
notificationRouter.patch('/read-all', async (req, res) => {
  await Notification.updateMany({ user_id: req.user.userId, is_read: false }, { is_read: true });
  res.json({ message: 'All notifications marked as read' });
});
notificationRouter.patch('/:id/read', async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { is_read: true });
  res.json({ message: 'Notification marked as read' });
});

// User Routes
const userRouter = express.Router();
userRouter.use(authenticate);
const UserModel = require('../models/mysql/User.model');

userRouter.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });
  const { Op } = require('sequelize');
  const users = await UserModel.findAll({
    where: { [Op.or]: [{ name: { [Op.like]: `%${q}%` } }, { email: { [Op.like]: `%${q}%` } }], is_active: true },
    attributes: ['id', 'name', 'email', 'avatar'],
    limit: 10,
  });
  res.json({ users });
});
userRouter.get('/profile', async (req, res) => {
  const user = await UserModel.findByPk(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: user.toSafeObject() });
});
userRouter.put('/profile', async (req, res) => {
  const { name, bio, github_username, timezone, preferences, avatar } = req.body;
  await UserModel.update({ name, bio, github_username, timezone, preferences, avatar }, { where: { id: req.user.userId } });
  const user = await UserModel.findByPk(req.user.userId);
  res.json({ user: user.toSafeObject() });
});

// GitHub Integration
userRouter.post('/integrations/github', async (req, res) => {
  try {
    const { pat } = req.body;
    if (!pat) return res.status(400).json({ error: 'GitHub PAT is required' });
    // Fetch user info from GitHub
    const ghRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${pat}`, 'User-Agent': 'DevPilot-AI', Accept: 'application/vnd.github+json' },
    });
    if (!ghRes.ok) return res.status(400).json({ error: 'Invalid GitHub token. Please check and try again.' });
    const ghUser = await ghRes.json();
    const github_data = {
      username: ghUser.login,
      display_name: ghUser.name || ghUser.login,
      avatar: ghUser.avatar_url,
      public_repos: ghUser.public_repos,
      followers: ghUser.followers,
      following: ghUser.following,
      bio: ghUser.bio,
      html_url: ghUser.html_url,
    };
    await UserModel.update({ github_pat: pat, github_username: ghUser.login, github_data }, { where: { id: req.user.userId } });
    const user = await UserModel.findByPk(req.user.userId);
    res.json({ user: user.toSafeObject(), github_data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/integrations/github', async (req, res) => {
  try {
    const user = await UserModel.findByPk(req.user.userId, { attributes: ['github_data', 'github_pat'] });
    if (!user?.github_data) return res.json({ connected: false });
    res.json({ connected: true, data: user.github_data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/integrations/github/repos', async (req, res) => {
  try {
    const user = await UserModel.findByPk(req.user.userId, { attributes: ['github_pat'] });
    if (!user?.github_pat) return res.status(400).json({ error: 'GitHub not connected' });
    const ghRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
      headers: { Authorization: `Bearer ${user.github_pat}`, 'User-Agent': 'DevPilot-AI', Accept: 'application/vnd.github+json' },
    });
    const repos = await ghRes.json();
    res.json({ repos: repos.map(r => ({ id: r.id, name: r.name, full_name: r.full_name, description: r.description, language: r.language, stars: r.stargazers_count, open_issues: r.open_issues_count, url: r.html_url, updated_at: r.updated_at })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.delete('/integrations/github', async (req, res) => {
  try {
    await UserModel.update({ github_pat: null, github_data: null, github_username: null }, { where: { id: req.user.userId } });
    const user = await UserModel.findByPk(req.user.userId);
    res.json({ user: user.toSafeObject() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Jira Integration
userRouter.post('/integrations/jira', async (req, res) => {
  try {
    const { jira_url, jira_email, jira_token } = req.body;
    if (!jira_url || !jira_email || !jira_token) return res.status(400).json({ error: 'Jira URL, email, and API token are all required' });
    const baseUrl = jira_url.replace(/\/$/, '');
    const creds = Buffer.from(`${jira_email}:${jira_token}`).toString('base64');
    const jiraRes = await fetch(`${baseUrl}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${creds}`, Accept: 'application/json' },
    });
    if (!jiraRes.ok) return res.status(400).json({ error: 'Invalid Jira credentials. Check your URL, email, and token.' });
    const jiraUser = await jiraRes.json();
    const jira_data = {
      display_name: jiraUser.displayName,
      account_id: jiraUser.accountId,
      avatar: jiraUser.avatarUrls?.['48x48'],
      base_url: baseUrl,
    };
    await UserModel.update({ jira_url: baseUrl, jira_email, jira_token, jira_data }, { where: { id: req.user.userId } });
    const user = await UserModel.findByPk(req.user.userId);
    res.json({ user: user.toSafeObject(), jira_data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/integrations/jira', async (req, res) => {
  try {
    const user = await UserModel.findByPk(req.user.userId, { attributes: ['jira_data', 'jira_token'] });
    if (!user?.jira_data) return res.json({ connected: false });
    res.json({ connected: true, data: user.jira_data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.get('/integrations/jira/projects', async (req, res) => {
  try {
    const user = await UserModel.findByPk(req.user.userId, { attributes: ['jira_url', 'jira_email', 'jira_token'] });
    if (!user?.jira_token) return res.status(400).json({ error: 'Jira not connected' });
    const creds = Buffer.from(`${user.jira_email}:${user.jira_token}`).toString('base64');
    const jiraRes = await fetch(`${user.jira_url}/rest/api/3/project/search?maxResults=20`, {
      headers: { Authorization: `Basic ${creds}`, Accept: 'application/json' },
    });
    const data = await jiraRes.json();
    res.json({ projects: (data.values || []).map(p => ({ id: p.id, key: p.key, name: p.name, type: p.projectTypeKey, avatar: p.avatarUrls?.['48x48'] })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

userRouter.delete('/integrations/jira', async (req, res) => {
  try {
    await UserModel.update({ jira_url: null, jira_email: null, jira_token: null, jira_data: null }, { where: { id: req.user.userId } });
    const user = await UserModel.findByPk(req.user.userId);
    res.json({ user: user.toSafeObject() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Analytics Routes
const analyticsRouter = express.Router();
analyticsRouter.use(authenticate);
const Project = require('../models/mongo/Project.model');
const Task = require('../models/mongo/Task.model');

analyticsRouter.get('/overview', async (req, res) => {
  const userId = req.user.userId;
  const [totalProjects, activeTasks, completedProjects] = await Promise.all([
    Project.countDocuments({ $or: [{ owner_id: userId }, { 'members.user_id': userId }], is_deleted: false }),
    Task.countDocuments({ assignees: userId, status: { $in: ['todo', 'in_progress', 'review'] }, is_deleted: false }),
    Project.countDocuments({ $or: [{ owner_id: userId }, { 'members.user_id': userId }], status: 'completed', is_deleted: false }),
  ]);
  res.json({ totalProjects, activeTasks, completedProjects });
});

analyticsRouter.get('/project/:projectId/burndown', async (req, res) => {
  const { Sprint } = require('../models/mongo/index');
  const sprints = await Sprint.find({ project_id: req.params.projectId }).sort('-createdAt').limit(5);
  res.json({ sprints });
});

// File Routes
const fileRouter = express.Router();
fileRouter.use(authenticate);
fileRouter.get('/', (req, res) => res.json({ files: [] }));

module.exports = { sprintRouter, teamRouter, chatRouter, notificationRouter, userRouter, analyticsRouter, fileRouter };
