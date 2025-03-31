import {
  pgTable,
  text,
  serial,
  date,
  timestamp,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
});

export const cohortMemberships = pgTable("cohort_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  cohortId: integer("cohort_id").references(() => cohorts.id).notNull(),
  role: text("role", { enum: ["member", "moderator"] }).default("member").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: uuid("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  used: integer("used").default(0),
});

export const babies = pgTable("babies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  birthDate: date("birth_date").notNull(),
  birthWeek: date("birth_week").notNull(),
  cohortId: integer("cohort_id").references(() => cohorts.id),
  photoUrl: text("photo_url"),
});

export const cohorts = pgTable("cohorts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Keep startDate and endDate for backward compatibility, but they're optional now
  startDate: date("start_date"),
  endDate: date("end_date"),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  cohortId: integer("cohort_id").references(() => cohorts.id),
  content: text("content").notNull(),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const upvotes = pgTable("upvotes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    fullName: true,
    email: true,
  })
  .extend({
    password: z.string().min(8, "Password must be at least 8 characters"),
    email: z.string().email("Invalid email address"),
  });

export const insertBabySchema = createInsertSchema(babies).pick({
  name: true,
  birthDate: true,
  photoUrl: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  content: true,
  cohortId: true,
  photoUrl: true,
});

export const insertCohortSchema = createInsertSchema(cohorts).pick({
  name: true,
  description: true,
});

export const insertCohortMembershipSchema = createInsertSchema(cohortMemberships).pick({
  userId: true,
  cohortId: true, 
  role: true,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().uuid("Invalid reset token"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  postId: true,
  content: true,
});

export const insertUpvoteSchema = createInsertSchema(upvotes).pick({
  postId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBaby = z.infer<typeof insertBabySchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertCohort = z.infer<typeof insertCohortSchema>;
export type InsertCohortMembership = z.infer<typeof insertCohortMembershipSchema>;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertUpvote = z.infer<typeof insertUpvoteSchema>;
export type ForgotPassword = z.infer<typeof forgotPasswordSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type User = typeof users.$inferSelect;
export type Baby = typeof babies.$inferSelect;
export type Cohort = typeof cohorts.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Upvote = typeof upvotes.$inferSelect;
export type CohortMembership = typeof cohortMemberships.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
