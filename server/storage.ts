import { IStorage } from "./types";
import { User, Baby, Cohort, Post, InsertUser, InsertBaby, InsertPost } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { addMonths, startOfMonth, endOfMonth } from "date-fns";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private babies: Map<number, Baby>;
  private cohorts: Map<number, Cohort>;
  private posts: Map<number, Post>;
  private currentId: { [key: string]: number };
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.babies = new Map();
    this.cohorts = new Map();
    this.posts = new Map();
    this.currentId = { users: 1, babies: 1, cohorts: 1, posts: 1 };
    this.sessionStore = new MemoryStore({ checkPeriod: 86400000 });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createBaby(insertBaby: InsertBaby, userId: number): Promise<Baby> {
    const id = this.currentId.babies++;
    const cohort = await this.getOrCreateCohort(insertBaby.birthDate);
    const baby = { ...insertBaby, id, userId, cohortId: cohort.id };
    this.babies.set(id, baby);
    return baby;
  }

  async getBabyByUserId(userId: number): Promise<Baby | undefined> {
    return Array.from(this.babies.values()).find(
      (baby) => baby.userId === userId,
    );
  }

  private async getOrCreateCohort(birthDate: Date): Promise<Cohort> {
    const start = startOfMonth(birthDate);
    const end = endOfMonth(addMonths(start, 1));

    let cohort = Array.from(this.cohorts.values()).find(
      (c) => c.startDate <= birthDate && c.endDate >= birthDate,
    );

    if (!cohort) {
      const id = this.currentId.cohorts++;
      cohort = {
        id,
        name: `${start.toLocaleString('default', { month: 'long', year: 'numeric' })} Babies`,
        startDate: start,
        endDate: end,
      };
      this.cohorts.set(id, cohort);
    }

    return cohort;
  }

  async getCohort(id: number): Promise<Cohort | undefined> {
    return this.cohorts.get(id);
  }

  async createPost(insertPost: InsertPost, userId: number): Promise<Post> {
    const id = this.currentId.posts++;
    const post = { ...insertPost, id, userId, createdAt: new Date() };
    this.posts.set(id, post);
    return post;
  }

  async getPostsByCohort(cohortId: number): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.cohortId === cohortId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const storage = new MemStorage();
