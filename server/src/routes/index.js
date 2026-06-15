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

sprintRouter.patch('/:projectId/:sprintId/start', async (req, res) => {
  try {
    const sprint = await Sprint.findByIdAndUpdate(req.params.sprintId, { status: 'active', start_date: new Date() }, { new: true });
    res.json({ sprint });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

sprintRouter.patch('/:projectId/:sprintId/complete', async (req, res) => {
  try {
    const sprint = await Sprint.findByIdAndUpdate(req.params.sprintId, { status: 'completed', end_date: new Date() }, { new: true });
    res.json({ sprint });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

sprintRouter.post('/:projectId/:sprintId/estimate', async (req, res) => {
  try {
    const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
    const Task = require('../models/mongo/Task.model');
    const tasks = await Task.find({ sprint_id: req.params.sprintId, status: { $ne: 'completed' } });
    
    if (tasks.length === 0) return res.json({ message: 'No tasks to estimate' });

    const tasksList = tasks.map(t => `- ID: ${t._id}\n  Title: ${t.title}\n  Desc: ${t.description}`).join('\n\n');
    const prompt = `Estimate story points (1, 2, 3, 5, 8, 13) for these tasks based on title and description:\n\n${tasksList}\n\nReturn JSON ONLY. Format: {"estimates": [{"id": "task_id", "points": 5}]}`;

    const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    const response = await fetch(`${AI_ENGINE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], context_type: 'general' }),
    });

    if (!response.ok) throw new Error('AI estimation failed');
    const data = await response.json();
    
    // Parse the JSON block from markdown if present
    let jsonStr = data.reply;
    if (jsonStr.includes('\`\`\`json')) {
      jsonStr = jsonStr.split('\`\`\`json')[1].split('\`\`\`')[0];
    } else if (jsonStr.includes('\`\`\`')) {
      jsonStr = jsonStr.split('\`\`\`')[1].split('\`\`\`')[0];
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    
    // Update tasks
    for (const est of parsed.estimates) {
      await Task.findByIdAndUpdate(est.id, { story_points: est.points });
    }

    res.json({ message: 'Estimation complete', estimates: parsed.estimates });
  } catch (err) { 
    console.error('Estimation error:', err);
    res.status(500).json({ error: err.message }); 
  }
});


// Team Routes
const teamRouter = express.Router();
teamRouter.use(authenticate);
const { Team, TeamMember } = require('../models/mysql/index');
const User = require('../models/mysql/User.model');

teamRouter.get('/', async (req, res) => {
  try {
    const memberships = await TeamMember.findAll({ where: { user_id: req.user.userId, status: 'active' } });
    const teamIds = memberships.map(m => m.team_id);
    const teams = await Team.findAll({ where: { id: teamIds, is_active: true } });
    res.json({ teams });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
teamRouter.post('/', async (req, res) => {
  const team = await Team.create({ ...req.body, owner_id: req.user.userId });
  await TeamMember.create({ team_id: team.id, user_id: req.user.userId, role: 'owner' });
  res.status(201).json({ team });
});
teamRouter.get('/:teamId/members', async (req, res) => {
  try {
    const members = await TeamMember.findAll({ where: { team_id: req.params.teamId } });
    const userIds = members.map(m => m.user_id);
    const users = await User.findAll({ where: { id: userIds }, attributes: ['id', 'name', 'email', 'avatar'] });
    
    const membersWithUsers = members.map(m => {
      const u = users.find(user => user.id === m.user_id);
      return {
        ...m.toJSON(),
        name: u ? u.name : 'Unknown User',
        email: u ? u.email : '',
        avatar: u ? u.avatar : ''
      };
    });
    
    res.json({ members: membersWithUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
teamRouter.post('/:teamId/members', async (req, res) => {
  try {
    const { Notification } = require('../models/mongo/index');
    
    // Check if already a member/invited
    const existing = await TeamMember.findOne({ where: { team_id: req.params.teamId, user_id: req.body.user_id } });
    if (existing) {
      return res.status(400).json({ error: 'User is already a member or has a pending invite' });
    }
    
    const member = await TeamMember.create({ 
      team_id: req.params.teamId, 
      user_id: req.body.user_id, 
      role: req.body.role || 'member',
      status: 'invited'
    });
    
    const team = await Team.findByPk(req.params.teamId);
    
    const notification = await Notification.create({
      user_id: req.body.user_id,
      type: 'team_invite',
      title: 'New Team Invitation',
      message: `You have been invited to join the team "${team?.name || 'Unknown'}"`,
      data: { team_id: req.params.teamId, member_id: member.id, team_name: team?.name }
    });
    
    const io = req.app.get('io');
    io?.to(`user:${req.body.user_id}`).emit('notification:new', notification);
    
    res.status(201).json({ member, message: 'Invitation sent' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

teamRouter.post('/:teamId/invites/respond', async (req, res) => {
  try {
    const { action, notificationId } = req.body;
    const { Notification } = require('../models/mongo/index');
    
    const member = await TeamMember.findOne({ where: { team_id: req.params.teamId, user_id: req.user.userId, status: 'invited' } });
    if (!member) return res.status(404).json({ error: 'No pending invite found' });
    
    if (action === 'accept') {
      await member.update({ status: 'active' });
    } else {
      await member.destroy();
    }
    
    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, { is_read: true });
    }
    
    res.json({ message: `Invite ${action}ed` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

teamRouter.put('/:teamId', async (req, res) => {
  try {
    const team = await Team.findOne({ where: { id: req.params.teamId, owner_id: req.user.userId } });
    if (!team) return res.status(404).json({ error: 'Team not found or unauthorized' });
    await team.update({ name: req.body.name, description: req.body.description });
    res.json({ team });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

teamRouter.delete('/:teamId', async (req, res) => {
  try {
    const team = await Team.findOne({ where: { id: req.params.teamId, owner_id: req.user.userId } });
    if (!team) return res.status(404).json({ error: 'Team not found or unauthorized' });
    await team.destroy();
    // Also delete members
    await TeamMember.destroy({ where: { team_id: req.params.teamId } });
    res.json({ message: 'Team deleted' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

teamRouter.put('/:teamId/members/:userId', async (req, res) => {
  try {
    // Check if requester is owner/admin
    const requester = await TeamMember.findOne({ where: { team_id: req.params.teamId, user_id: req.user.userId } });
    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      return res.status(403).json({ error: 'Unauthorized to change roles' });
    }
    
    const member = await TeamMember.findOne({ where: { team_id: req.params.teamId, user_id: req.params.userId } });
    if (!member) return res.status(404).json({ error: 'Member not found' });
    
    await member.update({ role: req.body.role });
    res.json({ member });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

teamRouter.delete('/:teamId/members/:userId', async (req, res) => {
  try {
    const requester = await TeamMember.findOne({ where: { team_id: req.params.teamId, user_id: req.user.userId } });
    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin' && req.user.userId !== req.params.userId)) {
      return res.status(403).json({ error: 'Unauthorized to remove member' });
    }
    
    await TeamMember.destroy({ where: { team_id: req.params.teamId, user_id: req.params.userId } });
    res.json({ message: 'Member removed' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Team Chat Routes
teamRouter.get('/:teamId/chat', async (req, res) => {
  try {
    const { ChatMessage } = require('../models/mongo/index');
    const { page = 1, limit = 50 } = req.query;
    const messages = await ChatMessage.find({ team_id: req.params.teamId, is_deleted: false })
      .sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)).lean();
      
    // Attach user info to messages
    const userIds = [...new Set(messages.map(m => m.sender_id))];
    const users = await User.findAll({ where: { id: userIds }, attributes: ['id', 'name', 'avatar'] });
    const msgsWithUsers = messages.map(m => {
      const u = users.find(user => user.id === m.sender_id);
      return { ...m, sender_name: u?.name || 'Unknown', sender_avatar: u?.avatar };
    });
      
    res.json({ messages: msgsWithUsers.reverse() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

teamRouter.post('/:teamId/chat', async (req, res) => {
  try {
    const { ChatMessage, Notification } = require('../models/mongo/index');
    const message = await ChatMessage.create({
      ...req.body,
      team_id: req.params.teamId,
      sender_id: req.user.userId,
    });
    
    // Attach user info to the returned message
    const user = await User.findOne({ where: { id: req.user.userId }, attributes: ['id', 'name', 'avatar'] });
    const msgWithUser = { ...message.toJSON(), sender_name: user?.name || 'Unknown', sender_avatar: user?.avatar };
    
    const io = req.app.get('io');
    
    // Broadcast the message itself
    io?.to(`team:${req.params.teamId}:chat`).emit('chat:message', { message: msgWithUser });
    
    // Fetch all other team members to notify them
    const team = await Team.findByPk(req.params.teamId);
    const members = await TeamMember.findAll({ where: { team_id: req.params.teamId } });
    
    for (const m of members) {
      if (m.user_id !== req.user.userId) {
        const notification = await Notification.create({
          user_id: m.user_id,
          type: 'chat_message',
          title: `New message in ${team?.name || 'Team'}`,
          message: `${msgWithUser.sender_name}: ${msgWithUser.content.substring(0, 50)}${msgWithUser.content.length > 50 ? '...' : ''}`,
          data: { team_id: req.params.teamId }
        });
        io?.to(`user:${m.user_id}`).emit('notification:new', notification);
      }
    }
    
    res.status(201).json({ message: msgWithUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    let parsedData = user.github_data;
    if (typeof parsedData === 'string') {
      try { parsedData = JSON.parse(parsedData); } catch (e) {}
    }
    res.json({ connected: true, data: parsedData });
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
    let parsedData = user.jira_data;
    if (typeof parsedData === 'string') {
      try { parsedData = JSON.parse(parsedData); } catch (e) {}
    }
    res.json({ connected: true, data: parsedData });
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
