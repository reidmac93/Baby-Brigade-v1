import {
  User,
  Baby,
  Cohort,
  Post,
  CohortMembership,
  InsertUser,
  InsertBaby,
  InsertPost,
  InsertCohortMembership,
  PasswordResetToken,
  users,
  babies,
  cohorts,
  posts,
  passwordResetTokens,
  cohortMemberships,
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
  updateUserRole(userId: number, role: string): Promise<User>;
  getBabyByUserId(userId: number): Promise<Baby | undefined>;
  createBaby(insertBaby: InsertBaby, userId: number): Promise<Baby>;
  getCohort(id: number): Promise<Cohort | undefined>;
  createPost(insertPost: InsertPost, userId: number): Promise<Post>;
  getPostsByCohort(cohortId: number): Promise<Post[]>;
  getPost(id: number): Promise<Post | undefined>;
  updatePost(id: number, content: string, userId: number): Promise<Post | undefined>;
  deletePost(id: number, userId: number): Promise<boolean>;
  createPasswordResetToken(userId: number): Promise<string>;
  getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(tokenId: number): Promise<void>;
  // Cohort membership methods
  createCohortMembership(cohortId: number, userId: number, role: string): Promise<CohortMembership>;
  updateCohortMembershipRole(id: number, role: string): Promise<CohortMembership | undefined>;
  deleteCohortMembership(id: number): Promise<boolean>;
  getCohortMembershipById(id: number): Promise<CohortMembership | undefined>;
  getCohortMembershipsByUserId(userId: number): Promise<CohortMembership[]>;
  getCohortMembershipsByCohortId(cohortId: number): Promise<CohortMembership[]>;
  getCohortMembers(cohortId: number): Promise<User[]>;
  getCohortModerators(cohortId: number): Promise<User[]>;
  isCohortModerator(userId: number, cohortId: number): Promise<boolean>;
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

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id));
    return post;
  }

  async updatePost(id: number, content: string, userId: number): Promise<Post | undefined> {
    // First check if the post exists and belongs to the user
    const post = await this.getPost(id);
    if (!post || post.userId !== userId) {
      return undefined;
    }

    // Update the post
    const [updatedPost] = await db
      .update(posts)
      .set({ content })
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .returning();
    
    return updatedPost;
  }

  async deletePost(id: number, userId: number): Promise<boolean> {
    // First check if the post exists and belongs to the user
    const post = await this.getPost(id);
    if (!post || post.userId !== userId) {
      return false;
    }

    // Delete the post
    const result = await db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, userId)));
    
    return true;
  }

  async updateUserRole(userId: number, role: "user" | "admin"): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createCohortMembership(cohortId: number, userId: number, role: "member" | "moderator"): Promise<CohortMembership> {
    const [membership] = await db
      .insert(cohortMemberships)
      .values({
        cohortId,
        userId,
        role,
        createdAt: new Date(),
      })
      .returning();
    return membership;
  }

  async updateCohortMembershipRole(id: number, role: "member" | "moderator"): Promise<CohortMembership | undefined> {
    const [membership] = await db
      .update(cohortMemberships)
      .set({ role })
      .where(eq(cohortMemberships.id, id))
      .returning();
    return membership;
  }

  async deleteCohortMembership(id: number): Promise<boolean> {
    await db.delete(cohortMemberships).where(eq(cohortMemberships.id, id));
    return true;
  }

  async getCohortMembershipById(id: number): Promise<CohortMembership | undefined> {
    const [membership] = await db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.id, id));
    return membership;
  }

  async getCohortMembershipsByUserId(userId: number): Promise<CohortMembership[]> {
    return db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.userId, userId));
  }

  async getCohortMembershipsByCohortId(cohortId: number): Promise<CohortMembership[]> {
    return db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.cohortId, cohortId));
  }

  async getCohortMembers(cohortId: number): Promise<User[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .innerJoin(
        cohortMemberships,
        eq(users.id, cohortMemberships.userId)
      )
      .where(eq(cohortMemberships.cohortId, cohortId));
  }

  async getCohortModerators(cohortId: number): Promise<User[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .innerJoin(
        cohortMemberships,
        eq(users.id, cohortMemberships.userId)
      )
      .where(
        and(
          eq(cohortMemberships.cohortId, cohortId),
          eq(cohortMemberships.role, "moderator")
        )
      );
  }

  async isCohortModerator(userId: number, cohortId: number): Promise<boolean> {
    const [membership] = await db
      .select()
      .from(cohortMemberships)
      .where(
        and(
          eq(cohortMemberships.userId, userId),
          eq(cohortMemberships.cohortId, cohortId),
          eq(cohortMemberships.role, "moderator")
        )
      );
    return !!membership;
  }
}

export const storage = new DatabaseStorage();
