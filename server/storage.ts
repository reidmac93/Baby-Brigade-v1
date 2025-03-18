import { IStorage } from "./types";
import { User, Baby, Cohort, Post, InsertUser, InsertBaby, InsertPost } from "@shared/schema";
import { users, babies, cohorts, posts } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { addMonths, startOfMonth, endOfMonth } from "date-fns";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createBaby(insertBaby: InsertBaby, userId: number): Promise<Baby> {
    const birthDate = new Date(insertBaby.birthDate);
    const cohort = await this.getOrCreateCohort(birthDate);

    const [baby] = await db
      .insert(babies)
      .values({
        ...insertBaby,
        userId,
        cohortId: cohort.id,
        birthDate,
      })
      .returning();

    return baby;
  }

  async getBabyByUserId(userId: number): Promise<Baby | undefined> {
    const [baby] = await db.select().from(babies).where(eq(babies.userId, userId));
    return baby;
  }

  private async getOrCreateCohort(birthDate: Date): Promise<Cohort> {
    const start = startOfMonth(birthDate);
    const end = endOfMonth(addMonths(start, 1));

    // Try to find existing cohort
    const [existingCohort] = await db
      .select()
      .from(cohorts)
      .where(
        eq(cohorts.startDate, start)
      );

    if (existingCohort) {
      return existingCohort;
    }

    // Create new cohort
    const [cohort] = await db
      .insert(cohorts)
      .values({
        name: `${start.toLocaleString('default', { month: 'long', year: 'numeric' })} Babies`,
        startDate: start,
        endDate: end,
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
        ...insertPost,
        userId,
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
      .orderBy(posts.createdAt, "desc");
  }
}

export const storage = new DatabaseStorage();