const Task = require('../models/mongo/Task.model');
const Project = require('../models/mongo/Project.model');
const { ActivityLog, Notification } = require('../models/mongo/index');
const mongoose = require('mongoose');
const { sendNotificationToUser } = require('../sockets/socketHandlers');

// ─── Get Tasks for Project ────────────────────────────────────────────────────
exports.getTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, assignee, sprint_id, search, sort = 'kanban_order' } = req.query;

    const filter = { project_id: projectId, is_deleted: false };
    if (status) filter.status = status;
    if (assignee) filter.assignees = assignee;
    if (sprint_id) filter.sprint_id = sprint_id;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(filter).sort(sort).lean();
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks', details: err.message });
  }
};

// ─── Get Kanban Board ─────────────────────────────────────────────────────────
exports.getKanbanBoard = async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await Task.find({ project_id: projectId, is_deleted: false })
      .sort({ kanban_order: 1 }).lean();

    const columns = {
      backlog: [], todo: [], in_progress: [], review: [], testing: [], completed: []
    };
    tasks.forEach(task => {
      if (columns[task.status]) columns[task.status].push(task);
    });

    res.json({ board: columns });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch kanban board' });
  }
};

// ─── Create Task ──────────────────────────────────────────────────────────────
exports.createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const taskCount = await Task.countDocuments({ project_id: projectId, status: req.body.status || 'backlog' });

    const task = await Task.create({
      ...req.body,
      project_id: projectId,
      reporter_id: req.user.userId,
      kanban_order: taskCount,
    });

    // Update project progress
    await updateProjectProgress(projectId);

    // Send notifications to assignees
    if (task.assignees?.length > 0) {
      const notifs = task.assignees.map(userId => ({
        user_id: userId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You've been assigned to "${task.title}"`,
        data: { task_id: task._id, project_id: projectId },
        action_url: `/projects/${projectId}/board`,
        project_id: projectId,
        from_user_id: req.user.userId,
      }));
      await Notification.insertMany(notifs);
      const io = req.app.get('io');
      notifs.forEach(notif => {
        sendNotificationToUser(io, notif.user_id, notif);
      });
    }

    await ActivityLog.create({
      project_id: projectId,
      user_id: req.user.userId,
      action: `Created task "${task.title}"`,
      entity_type: 'task',
      entity_id: task._id.toString(),
      entity_name: task.title,
    });

    const io = req.app.get('io');
    io?.to(`project:${projectId}`).emit('task:created', { task });

    res.status(201).json({ message: 'Task created', task });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task', details: err.message });
  }
};

// ─── Update Task ──────────────────────────────────────────────────────────────
exports.updateTask = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date();
    }

    const task = await Task.findByIdAndUpdate(req.params.taskId, { $set: updates }, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await updateProjectProgress(task.project_id);

    const io = req.app.get('io');
    io?.to(`project:${task.project_id}`).emit('task:updated', { task });

    res.json({ message: 'Task updated', task });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task', details: err.message });
  }
};

// ─── Move Task (Kanban Drag-Drop) ─────────────────────────────────────────────
exports.moveTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { newStatus, newOrder, sourceStatus } = req.body;

    const task = await Task.findByIdAndUpdate(
      taskId,
      { $set: { status: newStatus, kanban_order: newOrder, ...(newStatus === 'completed' ? { completed_at: new Date() } : {}) } },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await updateProjectProgress(task.project_id);

    const io = req.app.get('io');
    io?.to(`project:${task.project_id}`).emit('task:moved', { taskId, newStatus, newOrder, sourceStatus });

    res.json({ message: 'Task moved', task });
  } catch (err) {
    res.status(500).json({ error: 'Failed to move task' });
  }
};

// ─── Delete Task ──────────────────────────────────────────────────────────────
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.taskId, { is_deleted: true }, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const io = req.app.get('io');
    io?.to(`project:${task.project_id}`).emit('task:deleted', { taskId: task._id });

    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// ─── Add Comment ──────────────────────────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.taskId,
      { $push: { comments: { author_id: req.user.userId, content } } },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Comment added', task });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// ─── Helper: Update Project Progress ─────────────────────────────────────────
const updateProjectProgress = async (projectId) => {
  const counts = await Task.aggregate([
    { $match: { project_id: new mongoose.Types.ObjectId(projectId.toString()), is_deleted: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const total = counts.reduce((s, c) => s + c.count, 0);
  const completed = counts.find(c => c._id === 'completed')?.count || 0;
  await Project.findByIdAndUpdate(projectId, {
    'progress.total_tasks': total,
    'progress.completed_tasks': completed,
    'progress.completion_percentage': total > 0 ? Math.round(completed / total * 100) : 0,
  });
};
