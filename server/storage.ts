import {
  User,
  Baby,
  Cohort,
  Post,
  InsertUser,
  InsertBaby,
  InsertPost,
  PasswordResetToken,
  users,
  babies,
  cohorts,
  posts,
  passwordResetTokens,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gt } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { addMonths, startOfMonth, endOfMonth } from "date-fns";
import { randomUUID } from "crypto";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User>;
  getBabyByUserId(userId: number): Promise<Baby | undefined>;
  createBaby(insertBaby: InsertBaby, userId: number): Promise<Baby>;
  getCohort(id: number): Promise<Cohort | undefined>;
  createPost(insertPost: InsertPost, userId: number): Promise<Post>;
  getPostsByCohort(cohortId: number): Promise<Post[]>;
  createPasswordResetToken(userId: number): Promise<string>;
  getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(tokenId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }
  
  async updateUserPassword(userId: number, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async createPasswordResetToken(userId: number): Promise<string> {
    // Create token that expires in 1 hour
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      used: 0,
    });

    return token;
  }

  async getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined> {
    const now = new Date();
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, now),
          eq(passwordResetTokens.used, 0)
        )
      );
    return resetToken;
  }

  async markTokenAsUsed(tokenId: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: 1 })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createBaby(insertBaby: InsertBaby, userId: number): Promise<Baby> {
    const birthDate = new Date(insertBaby.birthDate);
    // Get start of week (Sunday)
    const birthWeek = new Date(birthDate);
    birthWeek.setDate(birthDate.getDate() - birthDate.getDay());

    const cohort = await this.getOrCreateCohort(birthWeek);

    const [baby] = await db
      .insert(babies)
      .values({
        name: insertBaby.name,
        birthDate: birthDate.toISOString().split('T')[0],
        birthWeek: birthWeek.toISOString().split('T')[0],
        userId,
        cohortId: cohort.id,
      })
      .returning();

    return baby;
  }

  async getBabyByUserId(userId: number): Promise<Baby | undefined> {
    const [baby] = await db
      .select()
      .from(babies)
      .where(eq(babies.userId, userId));
    return baby;
  }

  private async getOrCreateCohort(birthDate: Date): Promise<Cohort> {
    const start = startOfMonth(birthDate);
    const end = endOfMonth(addMonths(start, 1));

    // Try to find existing cohort for this month
    const [existingCohort] = await db
      .select()
      .from(cohorts)
      .where(
        and(
          eq(cohorts.startDate, start.toISOString().split("T")[0]),
          eq(cohorts.endDate, end.toISOString().split("T")[0]),
        ),
      );

    if (existingCohort) {
      return existingCohort;
    }

    // Create new cohort
    const [cohort] = await db
      .insert(cohorts)
      .values({
        name: `${start.toLocaleString("default", { month: "long", year: "numeric" })} Babies`,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      })
      .returning();

    return cohort;
  }

  async getCohort(id: number): Promise<Cohort | undefined> {
    const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, id));
    return cohort;
  }

  async createPost(insertPost: InsertPost, userId: number): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values({
        content: insertPost.content,
        userId: userId,
        cohortId: insertPost.cohortId,
        createdAt: new Date(),
      })
      .returning();

    return post;
  }

  async getPostsByCohort(cohortId: number): Promise<Post[]> {
    return db
      .select()
      .from(posts)
      .where(eq(posts.cohortId, cohortId))
      .orderBy(desc(posts.createdAt));
  }
}

export const storage = new DatabaseStorage();
