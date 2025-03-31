import {
  User,
  Baby,
  Cohort,
  Post,
  Comment,
  Upvote,
  CohortMembership,
  InsertUser,
  InsertBaby,
  InsertPost,
  InsertComment,
  InsertUpvote,
  InsertCohortMembership,
  PasswordResetToken,
  users,
  babies,
  cohorts,
  posts,
  comments,
  upvotes,
  passwordResetTokens,
  cohortMemberships,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gt, sql } from "drizzle-orm";
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
  getAllUsers(): Promise<User[]>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User>;
  updateUserRole(userId: number, role: string): Promise<User>;
  getBabyByUserId(userId: number): Promise<Baby | undefined>;
  createBaby(insertBaby: InsertBaby, userId: number): Promise<Baby>;
  updateBaby(id: number, updateData: Partial<InsertBaby>, userId: number): Promise<Baby | undefined>;
  // Cohort methods
  getCohort(id: number): Promise<Cohort | undefined>;
  getAllCohorts(): Promise<Cohort[]>;
  getUserCohorts(userId: number): Promise<Cohort[]>;
  createCohort(name: string, description: string | null, creatorId: number): Promise<Cohort>;
  getCohortBabiesWithParents(cohortId: number): Promise<any[]>; // Returns babies with their parent info
  // Post methods
  createPost(insertPost: InsertPost, userId: number): Promise<Post>;
  getPostsByCohort(cohortId: number): Promise<Post[]>;
  getPost(id: number): Promise<Post | undefined>;
  updatePost(id: number, content: string, userId: number, photoUrl?: string | null): Promise<Post | undefined>;
  deletePost(id: number, userId: number): Promise<boolean>;
  // Password reset methods
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
  getCohortMembers(cohortId: number): Promise<any[]>; // Returns users with their membership details
  getCohortModerators(cohortId: number): Promise<any[]>; // Returns moderators with their membership details
  isCohortModerator(userId: number, cohortId: number): Promise<boolean>;
  // Comments methods
  createComment(insertComment: InsertComment, userId: number): Promise<Comment>;
  getCommentsByPost(postId: number): Promise<Comment[]>;
  getCommentsWithUsersByPost(postId: number): Promise<any[]>; // Comments with user information
  updateComment(id: number, content: string, userId: number): Promise<Comment | undefined>;
  deleteComment(id: number, userId: number): Promise<boolean>;
  // Upvotes methods
  createUpvote(insertUpvote: InsertUpvote, userId: number): Promise<Upvote>;
  removeUpvote(postId: number, userId: number): Promise<boolean>;
  getUpvotesByPost(postId: number): Promise<Upvote[]>;
  getUpvoteCount(postId: number): Promise<number>;
  hasUserUpvoted(postId: number, userId: number): Promise<boolean>;
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
  
  async getAllUsers(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .orderBy(users.fullName);
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
  
  async updateBaby(id: number, updateData: Partial<InsertBaby>, userId: number): Promise<Baby | undefined> {
    // First check if baby exists and belongs to the user
    const baby = await this.getBabyByUserId(userId);
    if (!baby || baby.id !== id) {
      return undefined;
    }
    
    const updateValues: any = {};
    
    if (updateData.name !== undefined) {
      updateValues.name = updateData.name;
    }
    
    if (updateData.birthDate !== undefined) {
      const birthDate = new Date(updateData.birthDate);
      updateValues.birthDate = birthDate.toISOString().split('T')[0];
      
      // Update birthWeek if birthDate changes
      const birthWeek = new Date(birthDate);
      birthWeek.setDate(birthDate.getDate() - birthDate.getDay());
      updateValues.birthWeek = birthWeek.toISOString().split('T')[0];
      
      // We don't update cohort assignment when editing - that would be confusing
      // for users who are part of custom cohorts
    }
    
    if (updateData.photoUrl !== undefined) {
      updateValues.photoUrl = updateData.photoUrl;
    }
    
    const [updatedBaby] = await db
      .update(babies)
      .set(updateValues)
      .where(eq(babies.id, id))
      .returning();
      
    return updatedBaby;
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

    // Use admin user (id: 1) as the creator for system-generated cohorts
    // Create new cohort
    const [cohort] = await db
      .insert(cohorts)
      .values({
        name: `${start.toLocaleString("default", { month: "long", year: "numeric" })} Babies`,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        creatorId: 1, // reidmac93 is admin, with ID 1
      })
      .returning();

    return cohort;
  }

  async getCohort(id: number): Promise<Cohort | undefined> {
    const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, id));
    return cohort;
  }

  async getAllCohorts(): Promise<Cohort[]> {
    return db
      .select()
      .from(cohorts)
      .orderBy(desc(cohorts.createdAt));
  }

  async getUserCohorts(userId: number): Promise<Cohort[]> {
    return db
      .select({
        id: cohorts.id,
        name: cohorts.name,
        description: cohorts.description,
        creatorId: cohorts.creatorId,
        createdAt: cohorts.createdAt,
        startDate: cohorts.startDate,
        endDate: cohorts.endDate,
      })
      .from(cohorts)
      .innerJoin(
        cohortMemberships,
        eq(cohorts.id, cohortMemberships.cohortId)
      )
      .where(eq(cohortMemberships.userId, userId))
      .orderBy(desc(cohorts.createdAt));
  }

  async createCohort(name: string, description: string | null, creatorId: number): Promise<Cohort> {
    // Create the cohort
    const [cohort] = await db
      .insert(cohorts)
      .values({
        name,
        description,
        creatorId,
      })
      .returning();

    // Automatically make the creator a moderator of the cohort
    await this.createCohortMembership(cohort.id, creatorId, "moderator");
    
    return cohort;
  }
  
  async getCohortBabiesWithParents(cohortId: number): Promise<any[]> {
    // Get all members of the cohort
    const cohortMembers = await this.getCohortMembers(cohortId);
    const membersWithBabies = [];
    
    // For each member, get their baby information if it exists
    for (const member of cohortMembers) {
      const baby = await this.getBabyByUserId(member.id);
      if (baby) {
        membersWithBabies.push({
          user: {
            id: member.id,
            username: member.username,
            fullName: member.fullName,
            email: member.email,
            role: member.role,
            membershipRole: member.membershipRole
          },
          baby: baby
        });
      }
    }
    
    return membersWithBabies;
  }

  async createPost(insertPost: InsertPost, userId: number): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values({
        content: insertPost.content,
        userId: userId,
        cohortId: insertPost.cohortId,
        photoUrl: insertPost.photoUrl,
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

  async updatePost(id: number, content: string, userId: number, photoUrl?: string | null): Promise<Post | undefined> {
    // First check if the post exists and belongs to the user
    const post = await this.getPost(id);
    if (!post || post.userId !== userId) {
      return undefined;
    }

    // Create update data
    const updateData: { content: string; photoUrl?: string | null } = { content };
    
    // Only update photoUrl if it's provided (even if null, to remove photo)
    if (photoUrl !== undefined) {
      updateData.photoUrl = photoUrl;
    }

    // Update the post
    const [updatedPost] = await db
      .update(posts)
      .set(updateData)
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

  async getCohortMembers(cohortId: number): Promise<any[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        membershipId: cohortMemberships.id,
        membershipRole: cohortMemberships.role,
      })
      .from(users)
      .innerJoin(
        cohortMemberships,
        eq(users.id, cohortMemberships.userId)
      )
      .where(eq(cohortMemberships.cohortId, cohortId));
  }

  async getCohortModerators(cohortId: number): Promise<any[]> {
    return db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        membershipId: cohortMemberships.id,
        membershipRole: cohortMemberships.role,
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

  // Comments methods
  async createComment(insertComment: InsertComment, userId: number): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values({
        content: insertComment.content,
        userId: userId,
        postId: insertComment.postId,
      })
      .returning();

    return comment;
  }

  async getCommentsByPost(postId: number): Promise<Comment[]> {
    return db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);
  }

  async getCommentsWithUsersByPost(postId: number): Promise<any[]> {
    return db
      .select({
        id: comments.id,
        postId: comments.postId,
        userId: comments.userId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        username: users.username,
        fullName: users.fullName,
      })
      .from(comments)
      .innerJoin(
        users,
        eq(comments.userId, users.id)
      )
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);
  }

  async updateComment(id: number, content: string, userId: number): Promise<Comment | undefined> {
    // First check if the comment exists and belongs to the user
    const [comment] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.userId, userId)));

    if (!comment) {
      return undefined;
    }

    // Update the comment
    const [updatedComment] = await db
      .update(comments)
      .set({ 
        content,
        updatedAt: new Date()
      })
      .where(and(eq(comments.id, id), eq(comments.userId, userId)))
      .returning();
    
    return updatedComment;
  }

  async deleteComment(id: number, userId: number): Promise<boolean> {
    // First check if the comment exists and belongs to the user
    const [comment] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.userId, userId)));

    if (!comment) {
      return false;
    }

    // Delete the comment
    await db
      .delete(comments)
      .where(and(eq(comments.id, id), eq(comments.userId, userId)));
    
    return true;
  }

  // Upvotes methods
  async createUpvote(insertUpvote: InsertUpvote, userId: number): Promise<Upvote> {
    // Check if the user already upvoted this post
    const hasUpvoted = await this.hasUserUpvoted(insertUpvote.postId, userId);
    if (hasUpvoted) {
      // If the user already upvoted, we throw an error
      throw new Error("User already upvoted this post");
    }

    const [upvote] = await db
      .insert(upvotes)
      .values({
        postId: insertUpvote.postId,
        userId: userId,
      })
      .returning();

    return upvote;
  }

  async removeUpvote(postId: number, userId: number): Promise<boolean> {
    await db
      .delete(upvotes)
      .where(
        and(
          eq(upvotes.postId, postId),
          eq(upvotes.userId, userId)
        )
      );
    
    return true;
  }

  async getUpvotesByPost(postId: number): Promise<Upvote[]> {
    return db
      .select()
      .from(upvotes)
      .where(eq(upvotes.postId, postId));
  }

  async getUpvoteCount(postId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(upvotes)
      .where(eq(upvotes.postId, postId));
    
    return result[0]?.count || 0;
  }

  async hasUserUpvoted(postId: number, userId: number): Promise<boolean> {
    const [upvote] = await db
      .select()
      .from(upvotes)
      .where(
        and(
          eq(upvotes.postId, postId),
          eq(upvotes.userId, userId)
        )
      );
    
    return !!upvote;
  }
}

export const storage = new DatabaseStorage();
