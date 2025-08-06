import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertUserSchema,
  insertTaskSchema,
  insertCommentSchema,
  insertLikeSchema,
  taskStatus,
  type TaskStatus
} from  "../shared/schema";
import { setupAuth } from "./auth";
import { setupWebSocketServer, broadcastMessage, WebSocketEvent } from "./websocket";

export async function registerRoutes(app: Express): Promise<void> {
  console.log("🛡️ Setting up authentication...");
  setupAuth(app);
  
  console.log("🛣️ Setting up API routes...");
  
  // Users endpoints
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove password before sending
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  
  app.get("/api/users/:id/profile", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const userWithStats = await storage.getUserWithStats(userId);
    if (!userWithStats) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove password before sending
    const { password, ...userWithoutPassword } = userWithStats;
    res.json(userWithoutPassword);
  });
  
  // Tasks endpoints
  app.get("/api/tasks", async (req: Request, res: Response) => {
    const tasks = await storage.getTasks();
    
    // Add "liked" status for current user if authenticated
    let tasksWithLikeStatus = tasks;
    
    if (req.isAuthenticated() && req.user) {
      tasksWithLikeStatus = await Promise.all(
        tasks.map(async (task) => {
          const liked = await storage.getLike(req.user!.id, task.id);
          return { ...task, liked: !!liked };
        })
      );
    } else {
      // No authenticated user, no likes
      tasksWithLikeStatus = tasks.map(task => ({ ...task, liked: false }));
    }
    
    // Sort tasks: newest first
    const sortedTasks = tasksWithLikeStatus.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    res.json(sortedTasks);
  });
  
  app.get("/api/tasks/pending-count", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const count = await storage.getPendingTasksCount(req.user.id);
    res.json({ count });
  });
  
  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Add "liked" status for current user if authenticated
    let liked = false;
    if (req.isAuthenticated() && req.user) {
      const likeRecord = await storage.getLike(req.user.id, task.id);
      liked = !!likeRecord;
    }
    
    res.json({ ...task, liked });
  });
  
  app.post("/api/tasks", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      // Validate request body
      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId: req.user.id, // Use the authenticated user
      });
      
      // Validate task status
      if (!taskStatus.safeParse(taskData.status).success) {
        return res.status(400).json({ message: "Invalid task status" });
      }
      
      const task = await storage.createTask(taskData);
      
      // Get full task with user details for broadcasting
      const fullTask = await storage.getTask(task.id);
      
      // Broadcast the new task to all connected clients
      broadcastMessage(WebSocketEvent.NEW_TASK, fullTask);
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });
  
  app.patch("/api/tasks/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    try {
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Check task ownership
      if (task.userId !== req.user.id) {
        return res.status(403).json({ message: "You cannot update this task" });
      }
      
      // Validate partial update
      const taskUpdateSchema = insertTaskSchema.partial();
      const taskUpdate = taskUpdateSchema.parse(req.body);
      
      // Validate task status if provided
      if (taskUpdate.status && !taskStatus.safeParse(taskUpdate.status).success) {
        return res.status(400).json({ message: "Invalid task status" });
      }
      
      // Cast status as TaskStatus if present
      if (taskUpdate.status) {
        taskUpdate.status = taskUpdate.status as TaskStatus;
      }
      
      const updatedTask = await storage.updateTask(taskId, taskUpdate);
      
      // If status was updated, broadcast the status change
      if (taskUpdate.status) {
        const fullTask = await storage.getTask(taskId);
        if (fullTask) {
          broadcastMessage(WebSocketEvent.TASK_STATUS_UPDATE, fullTask);
        }
      }
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });
  
  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Check task ownership
    const isAdmin = req.user.username === "ashterabbas";
    if (task.userId !== req.user.id && !isAdmin) {
      return res.status(403).json({ message: "You cannot delete this task" });
    }
    
    const success = await storage.deleteTask(taskId);
    if (success) {
      res.status(204).end();
    } else {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });
  
  // Comments endpoints
  app.get("/api/tasks/:id/comments", async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const comments = await storage.getCommentsByTask(taskId);
    res.json(comments);
  });
  
  app.post("/api/tasks/:id/comments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    try {
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Validate request body
      const commentData = insertCommentSchema.parse({
        ...req.body,
        userId: req.user.id,
        taskId
      });
      
      const comment = await storage.createComment(commentData);
      const commentWithUser = {
        ...comment,
        user: await storage.getUser(comment.userId)
      };
      
      res.status(201).json(commentWithUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create comment" });
    }
  });
  
  // Likes endpoints
  app.post("/api/tasks/:id/like", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    try {
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Check if already liked
      const existingLike = await storage.getLike(req.user.id, taskId);
      if (existingLike) {
        // Unlike if already liked
        await storage.deleteLike(req.user.id, taskId);
        
        const updatedTask = await storage.getTask(taskId);
        
        // Broadcast like update
        if (updatedTask) {
          broadcastMessage(WebSocketEvent.LIKE, {
            ...updatedTask,
            liked: false,
            action: 'unlike'
          });
        }
        
        return res.json({ ...updatedTask, liked: false });
      }
      
      // Like the task
      const likeData = insertLikeSchema.parse({
        userId: req.user.id,
        taskId
      });
      
      await storage.createLike(likeData);
      
      const updatedTask = await storage.getTask(taskId);
      
      // Broadcast like update
      if (updatedTask) {
        broadcastMessage(WebSocketEvent.LIKE, {
          ...updatedTask,
          liked: true,
          action: 'like'
        });
      }
      
      res.json({ ...updatedTask, liked: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to like/unlike task" });
    }
  });
  
  console.log("✅ All routes registered successfully");
}
