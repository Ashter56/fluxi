import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertUserSchema,
  insertTaskSchema,
  insertCommentSchema,
  insertLikeSchema,
  taskStatus
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Current user helper (mock authentication for now)
  // In a real app, this would be handled by middleware and sessions
  let currentUserId = 3; // Default to David's user ID (for demo)
  
  // Users endpoints
  app.get("/api/users/current", async (req: Request, res: Response) => {
    const user = await storage.getUser(currentUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove password before sending
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  
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
    
    // Add "liked" status for current user
    const tasksWithLikeStatus = await Promise.all(
      tasks.map(async (task) => {
        const liked = await storage.getLike(currentUserId, task.id);
        return { ...task, liked: !!liked };
      })
    );
    
    // Sort tasks: newest first
    const sortedTasks = tasksWithLikeStatus.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    res.json(sortedTasks);
  });
  
  app.get("/api/tasks/pending-count", async (req: Request, res: Response) => {
    const count = await storage.getPendingTasksCount();
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
    
    // Add "liked" status for current user
    const liked = await storage.getLike(currentUserId, task.id);
    
    res.json({ ...task, liked: !!liked });
  });
  
  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId: currentUserId, // Always use the current user
      });
      
      // Validate task status
      if (!taskStatus.safeParse(taskData.status).success) {
        return res.status(400).json({ message: "Invalid task status" });
      }
      
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });
  
  app.patch("/api/tasks/:id", async (req: Request, res: Response) => {
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
      if (task.userId !== currentUserId) {
        return res.status(403).json({ message: "You cannot update this task" });
      }
      
      // Validate partial update
      const taskUpdateSchema = insertTaskSchema.partial();
      const taskUpdate = taskUpdateSchema.parse(req.body);
      
      // Validate task status if provided
      if (taskUpdate.status && !taskStatus.safeParse(taskUpdate.status).success) {
        return res.status(400).json({ message: "Invalid task status" });
      }
      
      const updatedTask = await storage.updateTask(taskId, taskUpdate);
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to update task" });
    }
  });
  
  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    // Check task ownership
    if (task.userId !== currentUserId) {
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
        userId: currentUserId, // Always use the current user
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
      const existingLike = await storage.getLike(currentUserId, taskId);
      if (existingLike) {
        // Unlike if already liked
        await storage.deleteLike(currentUserId, taskId);
        
        const updatedTask = await storage.getTask(taskId);
        return res.json({ ...updatedTask, liked: false });
      }
      
      // Like the task
      const likeData = insertLikeSchema.parse({
        userId: currentUserId,
        taskId
      });
      
      await storage.createLike(likeData);
      
      const updatedTask = await storage.getTask(taskId);
      res.json({ ...updatedTask, liked: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to like/unlike task" });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
