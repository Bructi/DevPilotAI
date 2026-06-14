const express = require('express');
const router = express.Router({ mergeParams: true });
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Project-level task routes: /api/projects/:projectId/tasks
router.get('/board', taskController.getKanbanBoard);
router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.put('/:taskId', taskController.updateTask);
router.patch('/:taskId/move', taskController.moveTask);
router.delete('/:taskId', taskController.deleteTask);
router.post('/:taskId/comments', taskController.addComment);

module.exports = router;
