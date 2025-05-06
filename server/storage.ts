import { 
  users, type User, type InsertUser,
  tasks, type Task, type InsertTask, type TaskStatus,
  comments, type Comment, type InsertComment,
  likes, type Like, type InsertLike,
  type TaskWithDetails, type CommentWithUser, type UserWithStats
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Task methods
  getTasks(): Promise<TaskWithDetails[]>;
  getTask(id: number): Promise<TaskWithDetails | undefined>;
  getTasksByUser(userId: number): Promise<TaskWithDetails[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Comment methods
  getCommentsByTask(taskId: number): Promise<CommentWithUser[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  deleteComment(id: number): Promise<boolean>;
  
  // Like methods
  getLikesByTask(taskId: number): Promise<Like[]>;
  getLike(userId: number, taskId: number): Promise<Like | undefined>;
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(userId: number, taskId: number): Promise<boolean>;
  
  // Analytics
  getUserWithStats(userId: number): Promise<UserWithStats | undefined>;
  getPopularTasks(limit?: number): Promise<TaskWithDetails[]>;
  getPendingTasksCount(): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private comments: Map<number, Comment>;
  private likes: Map<number, Like>;
  private userCurrentId: number;
  private taskCurrentId: number;
  private commentCurrentId: number;
  private likeCurrentId: number;
  
  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.comments = new Map();
    this.likes = new Map();
    this.userCurrentId = 1;
    this.taskCurrentId = 1;
    this.commentCurrentId = 1;
    this.likeCurrentId = 1;
    
    // Add some demo users
    const demoUsers: InsertUser[] = [
      {
        username: "jane",
        password: "password",
        displayName: "Jane Smith",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
        bio: "UI/UX Designer",
      },
      {
        username: "alex",
        password: "password",
        displayName: "Alex Johnson",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
        bio: "Product Manager",
      },
      {
        username: "david",
        password: "password",
        displayName: "David Miller",
        avatarUrl: "https://images.unsplash.com/photo-1633332755192-727a05c4013d",
        bio: "Product Designer • Task Management Enthusiast",
      }
    ];
    
    demoUsers.forEach(user => this.createUser(user));
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Task methods
  async getTasks(): Promise<TaskWithDetails[]> {
    const taskList = Array.from(this.tasks.values());
    return Promise.all(taskList.map(task => this.enrichTask(task)));
  }
  
  async getTask(id: number): Promise<TaskWithDetails | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    return this.enrichTask(task);
  }
  
  async getTasksByUser(userId: number): Promise<TaskWithDetails[]> {
    const userTasks = Array.from(this.tasks.values()).filter(
      task => task.userId === userId
    );
    return Promise.all(userTasks.map(task => this.enrichTask(task)));
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskCurrentId++;
    const now = new Date();
    const task: Task = { ...insertTask, id, createdAt: now };
    this.tasks.set(id, task);
    return task;
  }
  
  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...taskUpdate };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    if (!this.tasks.has(id)) return false;
    
    // Delete associated comments and likes
    const taskComments = Array.from(this.comments.values())
      .filter(comment => comment.taskId === id);
    
    taskComments.forEach(comment => {
      this.comments.delete(comment.id);
    });
    
    const taskLikes = Array.from(this.likes.values())
      .filter(like => like.taskId === id);
    
    taskLikes.forEach(like => {
      this.likes.delete(like.id);
    });
    
    return this.tasks.delete(id);
  }
  
  // Comment methods
  async getCommentsByTask(taskId: number): Promise<CommentWithUser[]> {
    const taskComments = Array.from(this.comments.values())
      .filter(comment => comment.taskId === taskId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    return Promise.all(taskComments.map(async comment => {
      const user = await this.getUser(comment.userId);
      return { ...comment, user: user! };
    }));
  }
  
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const id = this.commentCurrentId++;
    const now = new Date();
    const comment: Comment = { ...insertComment, id, createdAt: now };
    this.comments.set(id, comment);
    return comment;
  }
  
  async deleteComment(id: number): Promise<boolean> {
    return this.comments.delete(id);
  }
  
  // Like methods
  async getLikesByTask(taskId: number): Promise<Like[]> {
    return Array.from(this.likes.values())
      .filter(like => like.taskId === taskId);
  }
  
  async getLike(userId: number, taskId: number): Promise<Like | undefined> {
    return Array.from(this.likes.values()).find(
      like => like.userId === userId && like.taskId === taskId
    );
  }
  
  async createLike(insertLike: InsertLike): Promise<Like> {
    // Check if already liked
    const existingLike = await this.getLike(insertLike.userId, insertLike.taskId);
    if (existingLike) return existingLike;
    
    const id = this.likeCurrentId++;
    const now = new Date();
    const like: Like = { ...insertLike, id, createdAt: now };
    this.likes.set(id, like);
    return like;
  }
  
  async deleteLike(userId: number, taskId: number): Promise<boolean> {
    const like = await this.getLike(userId, taskId);
    if (!like) return false;
    return this.likes.delete(like.id);
  }
  
  // Analytics
  async getUserWithStats(userId: number): Promise<UserWithStats | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const userTasks = await this.getTasksByUser(userId);
    const completed = userTasks.filter(task => task.status === "done").length;
    const pending = userTasks.filter(task => task.status !== "done").length;
    
    // Get popular tasks (most liked)
    const popularTasks = [...userTasks]
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 3);
    
    return {
      ...user,
      stats: {
        totalTasks: userTasks.length,
        completed,
        pending
      },
      popularTasks
    };
  }
  
  async getPopularTasks(limit: number = 5): Promise<TaskWithDetails[]> {
    const tasks = await this.getTasks();
    return [...tasks]
      .sort((a, b) => b.likes - a.likes)
      .slice(0, limit);
  }
  
  async getPendingTasksCount(): Promise<number> {
    const tasks = Array.from(this.tasks.values());
    return tasks.filter(task => task.status !== "done").length;
  }
  
  // Helper methods
  private async enrichTask(task: Task): Promise<TaskWithDetails> {
    const user = await this.getUser(task.userId);
    const taskLikes = await this.getLikesByTask(task.id);
    const taskComments = Array.from(this.comments.values())
      .filter(comment => comment.taskId === task.id);
    
    return {
      ...task,
      user: user!,
      likes: taskLikes.length,
      comments: taskComments.length
    };
  }
}

export const storage = new MemStorage();
