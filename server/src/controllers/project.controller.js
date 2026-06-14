const Project = require('../models/mongo/Project.model');
const Task = require('../models/mongo/Task.model');
const { ActivityLog } = require('../models/mongo/index');
const User = require('../models/mysql/User.model');
const { sendEmail } = require('../utils/email.service');

// ─── Get All Projects (for user) ─────────────────────────────────────────────
exports.getProjects = async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const userId = req.user.userId;

    const filter = {
      is_deleted: false,
      $or: [{ owner_id: userId }, { 'members.user_id': userId }],
    };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.$and = [{ name: { $regex: search, $options: 'i' } }];

    const total = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ projects, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
};

// ─── Get Single Project ───────────────────────────────────────────────────────
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || project.is_deleted) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// ─── Create Project ───────────────────────────────────────────────────────────
exports.createProject = async (req, res) => {
  try {
    const userId = req.user.userId;
    const project = await Project.create({
      ...req.body,
      owner_id: userId,
      members: [{ user_id: userId, role: 'admin' }],
    });

    await ActivityLog.create({
      project_id: project._id,
      user_id: userId,
      action: `Created project "${project.name}"`,
      entity_type: 'project',
      entity_id: project._id.toString(),
      entity_name: project.name,
    });

    // Emit socket event
    const io = req.app.get('io');
    io?.emit('project:created', { project });

    res.status(201).json({ message: 'Project created', project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
};

// ─── Update Project ───────────────────────────────────────────────────────────
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await ActivityLog.create({
      project_id: project._id,
      user_id: req.user.userId,
      action: `Updated project "${project.name}"`,
      entity_type: 'project',
      entity_id: project._id.toString(),
      entity_name: project.name,
    });

    const io = req.app.get('io');
    io?.to(`project:${project._id}`).emit('project:updated', { project });

    res.json({ message: 'Project updated', project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project', details: err.message });
  }
};

// ─── Delete Project (soft) ────────────────────────────────────────────────────
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.owner_id !== req.user.userId) return res.status(403).json({ error: 'Only owner can delete project' });

    await project.updateOne({ is_deleted: true });
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// ─── Add Member to Project ────────────────────────────────────────────────────
exports.addMember = async (req, res) => {
  try {
    const { user_id, role = 'developer' } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const exists = project.members.find(m => m.user_id === user_id);
    if (exists) return res.status(409).json({ error: 'User already a member' });

    project.members.push({ user_id, role });
    await project.save();

    // Fetch user to send email
    const user = await User.findByPk(user_id);
    if (user) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const projectUrl = `${clientUrl}/projects/${project._id}`;

      await sendEmail({
        to: user.email,
        subject: `You've been added to ${project.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #1e293b; margin-top: 0;">Welcome to the Team!</h2>
            <p style="color: #475569; line-height: 1.6;">You have been added to the project <strong>${project.name}</strong> on DevPilot AI as a <strong>${role}</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${projectUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Project</a>
            </div>
          </div>
        `,
      }).catch(err => console.error('Failed to send invite email:', err));
    }

    res.json({ message: 'Member added', project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add member' });
  }
};

// ─── Remove Member ─────────────────────────────────────────────────────────────
exports.removeMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.owner_id === userId) return res.status(400).json({ error: 'Cannot remove project owner' });

    project.members = project.members.filter(m => m.user_id !== userId);
    await project.save();

    res.json({ message: 'Member removed', project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

// ─── Project Stats ─────────────────────────────────────────────────────────────
exports.getProjectStats = async (req, res) => {
  try {
    const projectId = req.params.id;
    const taskCounts = await Task.aggregate([
      { $match: { project_id: require('mongoose').Types.ObjectId.createFromHexString(projectId), is_deleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 }, points: { $sum: '$story_points' } } },
    ]);

    const stats = { total: 0, by_status: {}, total_points: 0, completed_points: 0 };
    taskCounts.forEach(({ _id, count, points }) => {
      stats.by_status[_id] = { count, points: points || 0 };
      stats.total += count;
      stats.total_points += points || 0;
      if (_id === 'completed') stats.completed_points += points || 0;
    });
    stats.completion_rate = stats.total > 0 ? Math.round((stats.by_status.completed?.count || 0) / stats.total * 100) : 0;

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get project stats' });
  }
};

// ─── Get Project Members ───────────────────────────────────────────────────────
exports.getProjectMembers = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const userIds = project.members.map(m => m.user_id);
    const UserModel = require('../models/mysql/User.model');
    const { Op } = require('sequelize');

    const users = await UserModel.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'name', 'email', 'avatar']
    });

    const members = project.members.map(m => {
      const user = users.find(u => u.id === m.user_id);
      return {
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        name: user?.name || 'Unknown User',
        email: user?.email || '',
        avatar: user?.avatar || null,
      };
    });

    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get members' });
  }
};
