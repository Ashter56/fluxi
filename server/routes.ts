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
import { configureAuth } from "./auth";
import { broadcastMessage, WebSocketEvent } from "./websocket";

export async function registerRoutes(app: Express): Promise<void> {
  console.log("🛡️ Setting up authentication...");
  configureAuth(app);
  
  console.log("🛣️ Setting up API routes...");
  
  // Users endpoints
  app.get("/api/users/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "极Invalid user ID" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  
  app.get("/api/users/:userId/profile", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const userWithStats = await storage.getUserWithStats(userId);
    if (!userWithStats) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const { password, ...userWithoutPassword } = userWithStats;
    res.json(userWithoutPassword);
  });
  
  // Tasks endpoints
  app.get("/api/tasks", async (req: Request, res: Response) => {
    const tasks = await storage.getTasks();
    
    let tasksWithLikeStatus = tasks;
    
    if (req.isAuthenticated() && req.user) {
      tasksWithLikeStatus = await Promise.all(
        tasks.map(async (task) => {
          const liked = await storage.getLike((req.user as any).id, task.id);
          return { ...task, liked: !!liked };
        })
      );
    } else {
      tasksWithLikeStatus = tasks.map(task => ({ ...task, liked: false }));
    }
    
    const sortedTasks = tasksWithLikeStatus.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    res.json(sortedTasks);
  });
  
  app.get("/api/tasks/pending-count", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const count = await storage.getPendingTasksCount((req.user as any).id);
    res.json({ count });
  });
  
  app.get("/api/tasks/:taskId", async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.task极Id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    let liked = false;
    if (req.isAuthenticated() && req.user) {
      const likeRecord = await storage.getLike((req.user as any).id, task.id);
      liked = !!likeRecord;
    }
    
    res.json({ ...task, liked });
  });
  
  app.post("/api/tasks", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      console.log("Creating task with data:", req.body);
      console.log("User ID:", (req.user as any).id);
      
      // Create the task data with user ID first
      const taskData = {
        ...req.body,
        userId: (req.user as any).id,
      };
      
      console.log("Task data with user ID:", taskData);
      
      // Bypass Zod validation temporarily for testing
      // const validatedData = insertTaskSchema.parse(taskData);
      
      // if (!极taskStatus.safeParse(validatedData.status).success) {
      //   return res.status(400).json({ message: "Invalid task status" });
      // }
      
      const task = await storage.createTask(taskData as any);
      console.log("Task created successfully:", task);
      
      const fullTask = await storage.getTask(task.id);
      
      broadcastMessage(WebSocketEvent.NEW_TASK, fullTask);
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Task creation error:", error);
      // if (error instanceof z.ZodError) {
      //   return res.status(400).json({ message: error.errors });
      // }
      res.status(500).json({ message: "Failed to create task" });
    }
  });
  
  app.patch("/api/tasks/:taskId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    try {
      const task = await storage.getTask(taskId);
极      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.userId !== (req.user as any).id) {
        return res.status(403).极json({ message: "You cannot update this task" });
      }
      
      const taskUpdateSchema = insertTaskSchema.partial();
      const taskUpdate = taskUpdateSchema.parse(req.body);
      
      if (taskUpdate.status && !taskStatus.safeParse(taskUpdate.status).success) {
        return res.status(400).json({ message: "Invalid task status" });
      }
      
      if (taskUpdate.status) {
        taskUpdate.status = taskUpdate.status as TaskStatus;
      }
      
      const updatedTask = await storage.updateTask(taskId, taskUpdate);
      
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
  
  app.delete("/api/tasks/:taskId", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    const isAdmin = (req.user as any).username === "ashterabbas";
    if (task.userId !== (req.user as any).id && !isAdmin) {
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
  app.get("/api/tasks/:taskId/comments", async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    const comments = await storage.getCommentsByTask(taskId);
    res.json(comments);
  });
  
  app.post("/api/tasks/:taskId/comments", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }
    
    try {
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const commentData = insertCommentSchema.parse({
        ...req.body,
        userId: (req.user as any).id,
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
  app.post("/api/tasks/:taskId/like", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
极    }
    
    try {
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const existingLike = await storage.getLike((req.user as any).id, taskId);
      if (existingLike) {
        await storage.deleteLike((req.user as any).id, taskId);
        const updatedTask = await storage.getTask(taskId);
        
        if (updatedTask) {
          broadcastMessage(WebSocketEvent.LIKE, {
            ...updatedTask,
            liked: false,
            action: 'unlike'
          });
        }
        
        return res.json({ ...updatedTask, liked: false });
      }
      
      const likeData = insertLikeSchema.parse({
        userId极: (req.user as any).id,
        taskId
      });
      
      await storage.createLike(likeData);
      const updatedTask = await storage.getTask(taskId);
      
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
