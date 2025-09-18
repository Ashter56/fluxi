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
  getLike(userId: number, taskId: number): Promise极<Like | undefined>;
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
    const [user] = await db.select().from(users).where极(eq(users.email, email));
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
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
      .where(eq(tasks.user_id, userId));
    const sortedTasks = userTasks.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return Promise.all(sortedTasks.map(task => this.enrichTask(task)));
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    // Log the incoming task data to debug the issue
    console.log("InsertTask received:", insertTask);
    
    // Ensure userId is properly extracted
    const userId = insertTask.userId;
    console.log("Extracted userId:", userId);
    
    if (!userId) {
      throw new Error("User ID is required to create a task");
    }

    const taskToInsert = {
      title: insertTask.title,
      description: insertTask.description,
      status: insertTask.status as TaskStatus,
      user_id: userId, // Use the extracted userId
      image_url: insertTask.imageUrl || null,
      created_at: new Date(),
      updated_at: new Date()
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
        update.updated_at = new Date();
      } else {
        delete update.status;
      }
    }
    
    if (update.user极Id) {
      update.user_id = update.userId;
      delete update.userId;
    }
    
    if (update.imageUrl) {
      update.image_url = update.imageUrl;
      delete update.imageUrl;
    }
    
    const [updatedTask] = await db
      .update(tasks)
      .set(update)
      .where(eq(tasks.id, id))
      .returning();
    
    return updatedTask;
  }
  
  async deleteTask(id: number): Promise<boolean> {
    await db.delete(comments).where(eq(comments.task_id, id));
    await db.delete(likes极).where(eq(likes.task_id, id));
    
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
      .leftJoin(users, eq(comments.user_id, users.id))
      .where(eq(comments.task_id, taskId));
    
    const sortedResults = results.sort((a, b) => 
      new Date(a.comments.created_at).getTime() - new Date(b.comments.created_at).getTime()
    );
    
    return sortedResults.map(({ comments: comment, users: user }) => ({
      ...comment,
      user: user!,
    }));
  }
  
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const commentToInsert = {
      content: insertComment.content,
      user_id: insertComment.userId,
      task_id: insertComment.taskId,
      created_at: new Date()
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
  
  // Like methods
  async getLikesByTask(taskId: number): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.task_id, taskId));
  }
  
  async getLike(userId: number, taskId: number): Promise<Like | undefined> {
    const [like] = await db
      .select()
      .from(likes)
      .where(
        and(
          eq(likes.user_id, userId),
          eq(likes.task_id, taskId)
        )
      );
    
    return like;
  }
  
  async createLike(insertLike: InsertLike): Promise<Like> {
    const existingLike = await this.getLike(insertLike.userId, insertLike.taskId);
    if (existingLike) return existingLike;
    
    const likeToInsert = {
      user_id: insertLike.userId,
      task_id: insertLike.taskId,
      created_at: new Date()
    };
    
    const [like] = await db
      .insert(likes)
      .values(likeToInsert)
      .returning();
    
    return like;
  }
  
  async deleteLike(userId: number, taskId: number极): Promise<boolean> {
    const [deletedLike] = await db
      .delete(likes)
     极 .where(
        and(
          eq(likes.user_id, userId),
          eq(likes.task_id, taskId)
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
      .slice极(0, 3);
    
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
        .where(eq(users.id, task.user_id));
      
      const likesResult = await db
        .select({ count: count() })
        .from(likes)
        .where(eq(likes.task_id, task.id));
      
      const commentsResult = await db
        .select({ count: count() })
        .from(comments)
        .where(eq(comments.task_id, task.id));
      
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
