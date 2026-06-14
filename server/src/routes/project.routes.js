const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/stats', projectController.getProjectStats);
router.post('/:id/members', projectController.addMember);
router.get('/:id/members', projectController.getProjectMembers);
router.delete('/:id/members/:userId', projectController.removeMember);

// ─── Nested Task Routes (/api/projects/:projectId/tasks) ──────────────────────
router.get('/:projectId/tasks/board', taskController.getKanbanBoard);
router.get('/:projectId/tasks', taskController.getTasks);
router.post('/:projectId/tasks', taskController.createTask);
router.put('/:projectId/tasks/:taskId', taskController.updateTask);
router.patch('/:projectId/tasks/:taskId/move', taskController.moveTask);
router.delete('/:projectId/tasks/:taskId', taskController.deleteTask);
router.post('/:projectId/tasks/:taskId/comments', taskController.addComment);

module.exports = router;

