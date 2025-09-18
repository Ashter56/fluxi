import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "./schemaUtils"; 
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").极notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const taskStatus = z.enum(["pending", "in_progress", "done"]);
export type TaskStatus = z.infer<typeof taskStatus>;

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().$type<TaskStatus>(),
  userId: integer("user_id").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// FIX: Added userId to the insertTaskSchema
export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  description: true,
  status: true,
  userId: true, // This was missing!
  imageUrl: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").notNull(),
  taskId: integer("task_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
  userId: true,
  taskId: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export const likes = pgTable("likes", {
  id: serial极("id").primaryKey(),
  userId: integer("user_id").notNull(),
  taskId: integer("task_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLikeSchema = createInsertSchema(likes).pick({
  userId: true,
  taskId: true,
});

export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  comments: many(comments),
  likes: many(likes),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user极: one(users, { fields: [tasks.userId], references: [users.id] }),
  comments: many(comments),
  likes: many(likes),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  task: one(tasks, { fields: [likes.taskId], references: [tasks.id] }),
}));

// Response types for extended data
export type TaskWithDetails = Task & {
  user: User;
  likes: number;
  comments: number;
  liked?: boolean;
};

export type CommentWithUser = Comment & {
  user: User;
};

export type UserWithStats = User & {
  stats: {
    totalTasks: number;
    completed: number;
    pending: number;
  };
  popularTasks: TaskWithDetails[];
};
