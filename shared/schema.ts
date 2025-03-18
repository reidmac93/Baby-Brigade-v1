import {
  pgTable,
  text,
  serial,
  date,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
});

export const babies = pgTable("babies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  birthDate: date("birth_date").notNull(),
  birthWeek: date("birthWeek").notNull(),
  cohortId: integer("cohort_id").references(() => cohorts.id),
});

export const cohorts = pgTable("cohorts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  cohortId: integer("cohort_id").references(() => cohorts.id),
  content: text("content").notNull(),
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
});

export const insertPostSchema = createInsertSchema(posts).pick({
  content: true,
  cohortId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBaby = z.infer<typeof insertBabySchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type User = typeof users.$inferSelect;
export type Baby = typeof babies.$inferSelect;
export type Cohort = typeof cohorts.$inferSelect;
export type Post = typeof posts.$inferSelect;
