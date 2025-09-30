import express from 'express';
import { storage } from './storage';
import { User } from '../shared/schema';

const router = express.Router();

// Get current user
router.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Get current user with details
router.get('/api/users/current', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser((req.user as User).id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all tasks
router.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await storage.getTasks();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Get tasks by user
router.get('/api/tasks/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const tasks = await storage.getTasksByUser(userId);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ message: 'Failed to fetch user tasks' });
  }
});

// Get single task
router.get('/api/tasks/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
});

// Create task
router.post('/api/tasks', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { title, description, status, imageUrl } = req.body;
    
    if (!title || !status) {
      return res.status(400).json({ message: 'Title and status are required' });
    }

    const taskData = {
      title,
      description,
      status,
      userId: (req.user as User).id,
      imageUrl
    };

    console.log('Creating task with data:', taskData);
    const task = await storage.createTask(taskData);
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// Update task
router.put('/api/tasks/:taskId', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user owns the task
    if (task.user.id !== (req.user as User).id) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const updatedTask = await storage.updateTask(taskId, req.body);
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// Delete task
router.delete('/api/tasks/:taskId', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user owns the task
    if (task.user.id !== (req.user as User).id) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    const success = await storage.deleteTask(taskId);
    res.json({ success });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

// Like a task
router.post('/api/tasks/:taskId/like', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const userId = (req.user as User).id;
    const like = await storage.createLike({ userId, taskId });
    res.json(like);
  } catch (error) {
    console.error('Error liking task:', error);
    res.status(500).json({ message: 'Failed to like task' });
  }
});

// Unlike a task
router.delete('/api/tasks/:taskId/like', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const userId = (req.user as User).id;
    const success = await storage.deleteLike(userId, taskId);
    res.json({ success });
  } catch (error) {
    console.error('Error unliking task:', error);
    res.status(500).json({ message: 'Failed to unlike task' });
  }
});

// Get task likes
router.get('/api/tasks/:taskId/likes', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const likes = await storage.getLikesByTask(taskId);
    res.json(likes);
  } catch (error) {
    console.error('Error fetching task likes:', error);
    res.status(500).json({ message: 'Failed to fetch task likes' });
  }
});

// Get comments for a task
router.get('/api/tasks/:taskId/comments', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const comments = await storage.getCommentsByTask(taskId);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
});

// Add comment to a task
router.post('/api/tasks/:taskId/comments', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const comment = await storage.createComment({
      content,
      userId: (req.user as User).id,
      taskId
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: 'Failed to create comment' });
  }
});

// Delete comment
router.delete('/api/comments/:commentId', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const commentId = parseInt(req.params.commentId);
    if (isNaN(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    const success = await storage.deleteComment(commentId);
    res.json({ success });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

// Get pending tasks count for current user
router.get('/api/tasks/pending-count', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const count = await storage.getPendingTasksCount((req.user as User).id);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching pending tasks count:', error);
    res.status(500).json({ message: 'Failed to fetch pending tasks count' });
  }
});

// Get popular tasks
router.get('/api/tasks/popular', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const tasks = await storage.getPopularTasks(limit);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching popular tasks:', error);
    res.status(500).json({ message: 'Failed to fetch popular tasks' });
  }
});

// Get user stats
router.get('/api/users/:userId/stats', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const userStats = await storage.getUserWithStats(userId);
    if (!userStats) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userStats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Failed to fetch user stats' });
  }
});

// Export the router
export default router;
