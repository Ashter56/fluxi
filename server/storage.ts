import { 
  users, type User, type InsertUser,
  tasks, type Task, type InsertTask, type TaskStatus,
  comments, type Comment, type InsertComment,
  likes, type Like, type InsertLike,
  type TaskWithDetails, type CommentWithUser, type UserWithStats
} from "../shared/schema";
import { db } from "./db";
import { eq, and, count, desc, SQL, sql } from "drizzle-orm";
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
    
    // Log database connection details (without password)
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

    // Add connection test
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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Task methods
  async getTasks(): Promise<TaskWithDetails[]> {
    const taskList = await db.select()
      .from(tasks)
      .orderBy(desc(tasks.createdAt)); // Sort by most recently created first
    return Promise.all(taskList.map(task => this.enrichTask(task)));
  }
  
  async getTask(id: number): Promise<TaskWithDetails | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return undefined;
    return this.enrichTask(task);
  }
  
  async getTasksByUser(userId: number): Promise<TaskWithDetails[]> {
    const userTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt)); // Sort by most recently created first
    return Promise.all(userTasks.map(task => this.enrichTask(task)));
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values({
      ...insertTask,
      status: insertTask.status as TaskStatus
    }).returning();
    return task;
  }
  
  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    // Create a type-safe update object with correctly typed status
    const update: Record<string, any> = { ...taskUpdate };
    
    // Handle the status field separately
    if (update.status) {
      // Ensure status is a valid TaskStatus
      if (['pending', 'in_progress', 'done'].includes(update.status)) {
        // Cast to appropriate type
        update.status = update.status as "pending" | "in_progress" | "done";
        
        // When status changes, update the createdAt timestamp to bring it to the top of the feed
        update.createdAt = new Date();
      } else {
        delete update.status; // Remove invalid status
      }
    }
    
    const [updatedTask] = await db
      .update(tasks)
      .set(update as any) // Cast to any to bypass type checking for now
      .where(eq(tasks.id, id))
      .returning();
    
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    // Delete associated comments
    await db.delete(comments).where(eq(comments.taskId, id));
    
    // Delete associated likes
    await db.delete(likes).where(eq(likes.taskId, id));
    
    // Delete the task
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
      .where(eq(comments.taskId, taskId))
      .orderBy(comments.createdAt);
    
    return results.map(({ comments: comment, users: user }) => ({
      ...comment,
      user: user!,
    }));
  }
  
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values(insertComment)
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
  
  // Like methods
  async getLikesByTask(taskId: number): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.taskId, taskId));
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
    if (existingLike) return existingLike;
    
    const [like] = await db
      .insert(likes)
      .values(insertLike)
      .returning();
    
    return like;
  }
  
  async deleteLike(userId: number, taskId: number): Promise<boolean> {
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
    const results = await db
      .select({
        task: tasks,
        likeCount: count(likes.id).as('likeCount')
      })
      .from(tasks)
      .leftJoin(likes, eq(tasks.id, likes.taskId))
      .groupBy(tasks.id)
      .orderBy(desc(sql`"likeCount"`))
      .limit(limit);
    
    return Promise.all(results.map(({ task }) => this.enrichTask(task)));
  }
  
  async getPendingTasksCount(userId: number): Promise<number> {
    const result = await db
      .select({
        count: count()
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          sql`${tasks.status} != 'done'`
        )
      );
    
    return result[0]?.count ?? 0;
  }
  
  // Helper methods
  private async enrichTask(task: Task): Promise<TaskWithDetails> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, task.userId));
    
    const likesResult = await db
      .select({
        count: count()
      })
      .from(likes)
      .where(eq(likes.taskId, task.id));
    
    const commentsResult = await db
      .select({
        count: count()
      })
      .from(comments)
      .where(eq(comments.taskId, task.id));
    
    return {
      ...task,
      user: user!,
      likes: likesResult[0]?.count ?? 0,
      comments: commentsResult[0]?.count ?? 0
    };
  }
}

export const storage = new DatabaseStorage();
