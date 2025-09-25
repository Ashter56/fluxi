import { 
  users, type User, type InsertUser,
  tasks, type Task, type InsertTask, type TaskStatus,
  comments, type Comment, type InsertComment,
  likes, type Like, type InsertLike,
  type TaskWithDetails, type CommentWithUser, type UserWithStats
} from "../shared/schema";
import { db } from "./db";
import { eq, and, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  getPendingTasksCount(userId: number): Promise<number>;
  
  // Session store for authentication
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    console.log("🛢️ Initializing DatabaseStorage...");
    
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        console.log(`🔗 Connecting to database at: ${url.hostname}`);
      } catch (e) {
        console.log("ℹ️ DATABASE_URL format unexpected");
      }
    } else {
      console.log("⚠️ DATABASE_URL environment variable not set!");
    }

    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session'
    });

    pool.query('SELECT NOW() as db_time')
      .then(res => console.log(`✅ Database test successful. Current DB time: ${res.rows[0].db_time}`))
      .catch(err => console.error('❌ Database test failed:', err));
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const userToInsert = {
      username: insertUser.username,
      email: insertUser.email,
      display_name: insertUser.displayName,
      password: insertUser.password,
      avatar_url: insertUser.avatarUrl || null,
      bio: insertUser.bio || null
    };

    const [user] = await db.insert(users).values(userToInsert).returning();
    return user;
  }
  
  // Task methods
  async getTasks(): Promise<TaskWithDetails[]> {
    const taskList = await db.select().from(tasks);
    const sortedTasks = taskList.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return Promise.all(sortedTasks.map(task => this.enrichTask(task)));
  }
  
  async getTask(id: number): Promise<TaskWithDetails | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return undefined;
    return this.enrichTask(task);
  }
  
  async getTasksByUser(userId: number): Promise<TaskWithDetails[]> {
    const userTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.userId, userId));
    const sortedTasks = userTasks.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return Promise.all(sortedTasks.map(task => this.enrichTask(task)));
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    const taskToInsert = {
      title: insertTask.title,
      description: insertTask.description,
      status: insertTask.status as TaskStatus,
      userId: insertTask.userId,
      imageUrl: insertTask.imageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log("Creating task with data:", taskToInsert);
    
    try {
      const [task] = await db.insert(tasks).values(taskToInsert).returning();
      return task;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }
  
  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const update: Record<string, any> = { ...taskUpdate };
    
    if (update.status) {
      if (['pending', 'in_progress', 'done'].includes(update.status)) {
        update.status = update.status as "pending" | "in_progress" | "done";
        update.updatedAt = new Date();
      } else {
        delete update.status;
      }
    }
    
    const [updatedTask] = await db
      .update(tasks)
      .set(update)
      .where(eq(tasks.id, id))
      .returning();
    
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    await db.delete(comments).where(eq(comments.taskId, id));
    await db.delete(likes).where(eq(likes.taskId, id));
    
    const [deletedTask] = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();
    
    return !!deletedTask;
  }
  
  // Comment methods
  async getCommentsByTask(taskId: number): Promise<CommentWithUser[]> {
    const results = await db
      .select()
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.taskId, taskId));
    
    const sortedResults = results.sort((a, b) => 
      new Date(a.comments.createdAt).getTime() - new Date(b.comments.createdAt).getTime()
    );
    
    return sortedResults.map(({ comments: comment, users: user }) => ({
      ...comment,
      user: user!,
    }));
  }
  
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const commentToInsert = {
      content: insertComment.content,
      userId: insertComment.userId,
      taskId: insertComment.taskId,
      createdAt: new Date()
    };
    
    const [comment] = await db
      .insert(comments)
      .values(commentToInsert)
      .returning();
    
    return comment;
  }
  
  async deleteComment(id: number): Promise<boolean> {
    const [deletedComment] = await db
      .delete(comments)
      .where(eq(comments.id, id))
      .returning();
    
    return !!deletedComment;
  }
  
  // Like methods - FIXED FOR LIKE BUTTON ISSUE
  async getLikesByTask(taskId: number): Promise<Like[]> {
    return await db.select().from(likes).where(eq(likes.taskId, taskId));
  }
  
  async getLike(userId: number, taskId: number): Promise<Like | undefined> {
    const [like] = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.taskId, taskId)
        )
      );
    
    return like;
  }
  
  async createLike(insertLike: InsertLike): Promise<Like> {
    // Check if already liked
    const existingLike = await this.getLike(insertLike.userId, insertLike.taskId);
    if (existingLike) {
      console.log("Like already exists, returning existing like");
      return existingLike;
    }
    
    // Create new like
    const likeToInsert = {
      userId: insertLike.userId,
      taskId: insertLike.taskId,
      createdAt: new Date()
    };
    
    console.log("Creating new like:", likeToInsert);
    
    const [like] = await db
      .insert(likes)
      .values(likeToInsert)
      .returning();
    
    return like;
  }
  
  async deleteLike(userId: number, taskId: number): Promise<boolean> {
    console.log(`Deleting like for user ${userId}, task ${taskId}`);
    
    const [deletedLike] = await db
      .delete(likes)
      .where(
        and(
          eq(likes.userId, userId),
          eq(likes.taskId, taskId)
        )
      )
      .returning();
    
    return !!deletedLike;
  }
  
  // Analytics
  async getUserWithStats(userId: number): Promise<UserWithStats | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const userTasks = await this.getTasksByUser(userId);
    const completed = userTasks.filter(task => task.status === "done").length;
    const pending = userTasks.filter(task => task.status !== "done").length;
    
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
    const allTasks = await this.getTasks();
    return allTasks
      .sort((a, b) => b.likes - a.likes)
      .slice(0, limit);
  }
  
  async getPendingTasksCount(userId: number): Promise<number> {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status != $2',
        [userId, 'done']
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error("Error getting pending tasks count:", error);
      return 0;
    }
  }
  
  // Helper methods
  private async enrichTask(task: Task): Promise<TaskWithDetails> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, task.userId));
      
      const likesResult = await db
        .select({ count: count() })
        .from(likes)
        .where(eq(likes.taskId, task.id));
      
      const commentsResult = await db
        .select({ count: count() })
        .from(comments)
        .where(eq(comments.taskId, task.id));
      
      return {
        ...task,
        user: user!,
        likes: likesResult[0]?.count ?? 0,
        comments: commentsResult[0]?.count ?? 0
      };
    } catch (error) {
      console.error("Error enriching task:", error);
      return {
        ...task,
        user: {} as User,
        likes: 0,
        comments: 0
      };
    }
  }
}

export const storage = new DatabaseStorage();
