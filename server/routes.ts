import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBabySchema, insertPostSchema, insertCohortMembershipSchema, insertCohortSchema } from "@shared/schema";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.post("/api/baby", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const babyData = insertBabySchema.parse(req.body);
      const baby = await storage.createBaby(babyData, req.user!.id);
      res.status(201).json(baby);
    } catch (err) {
      res.status(400).json({ error: "Invalid baby data" });
    }
  });

  app.get("/api/baby", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const baby = await storage.getBabyByUserId(req.user!.id);
    if (!baby) return res.status(404).json({ error: "Baby not found" });
    res.json(baby);
  });
  
  // This API route is deprecated and replaced by /api/user/cohorts
  // The old route relied on baby's cohortId which is no longer the model
  // we're using with user-created cohorts

  app.get("/api/cohorts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const cohortId = parseInt(req.params.id);
      const cohort = await storage.getCohort(cohortId);
      if (!cohort) return res.status(404).json({ error: "Cohort not found" });
      
      res.json(cohort);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch cohort" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(postData, req.user!.id);
      log(`Created post: ${JSON.stringify(post)}`);
      res.status(201).json(post);
    } catch (err) {
      log(`Error creating post: ${err}`);
      res.status(400).json({ error: "Invalid post data" });
    }
  });

  app.get("/api/cohorts/:id/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const cohortId = parseInt(req.params.id);
      log(`Fetching posts for cohort ${cohortId}`);

      let posts = await storage.getPostsByCohort(cohortId);
      
      // Sort posts by createdAt in descending order (newest first)
      posts = posts.sort((a, b) => {
        // Since createdAt has a defaultNow(), it should always exist
        return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
      });
      
      log(`Found ${posts.length} posts`);

      const postsWithUsers = await Promise.all(
        posts.map(async (post) => {
          // We can be sure that userId is not null in our application
          const user = await storage.getUser(post.userId!);
          return { ...post, user };
        })
      );

      log(`Returning ${postsWithUsers.length} posts with user data`);
      res.json(postsWithUsers);
    } catch (err) {
      log(`Error fetching posts: ${err}`);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Update a post
  app.put("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const postId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Post content cannot be empty" });
      }

      const userId = req.user.id;
      log(`Updating post ${postId} for user ${userId}`);

      const updatedPost = await storage.updatePost(postId, content, userId);
      if (!updatedPost) {
        return res.status(404).json({ error: "Post not found or you don't have permission to edit it" });
      }

      log(`Post ${postId} updated successfully`);
      res.json(updatedPost);
    } catch (err) {
      log(`Error updating post: ${err}`);
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  // Delete a post
  app.delete("/api/posts/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const postId = parseInt(req.params.id);
      const userId = req.user.id;
      log(`Deleting post ${postId} for user ${userId}`);

      const success = await storage.deletePost(postId, userId);
      if (!success) {
        return res.status(404).json({ error: "Post not found or you don't have permission to delete it" });
      }

      log(`Post ${postId} deleted successfully`);
      res.json({ success: true });
    } catch (err) {
      log(`Error deleting post: ${err}`);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Get all members for a cohort
  app.get("/api/cohorts/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const cohortId = parseInt(req.params.id);
      const members = await storage.getCohortMembers(cohortId);
      res.json(members);
    } catch (err) {
      log(`Error fetching cohort members: ${err}`);
      res.status(500).json({ error: "Failed to fetch cohort members" });
    }
  });

  // Get cohort moderators
  app.get("/api/cohorts/:id/moderators", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const cohortId = parseInt(req.params.id);
      const moderators = await storage.getCohortModerators(cohortId);
      res.json(moderators);
    } catch (err) {
      log(`Error fetching cohort moderators: ${err}`);
      res.status(500).json({ error: "Failed to fetch cohort moderators" });
    }
  });

  // Check if user is a moderator for a cohort
  app.get("/api/cohorts/:id/is-moderator", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const cohortId = parseInt(req.params.id);
      const userId = req.user.id;
      const isModerator = await storage.isCohortModerator(userId, cohortId);
      // Return just the boolean value directly for easier consumption by useQuery
      res.json(isModerator);
    } catch (err) {
      log(`Error checking moderator status: ${err}`);
      res.status(500).json({ error: "Failed to check moderator status" });
    }
  });

  // Create cohort membership (add a user to a cohort)
  app.post("/api/cohort-membership", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { cohortId, userId, role } = req.body;
      
      // Check if the requesting user is a moderator
      const requestingUserId = req.user.id;
      const isModerator = await storage.isCohortModerator(requestingUserId, cohortId);
      
      if (!isModerator && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Only moderators and admins can add members to a cohort" });
      }
      
      const membershipData = insertCohortMembershipSchema.parse(req.body);
      const membership = await storage.createCohortMembership(
        membershipData.cohortId,
        membershipData.userId,
        membershipData.role || 'member'
      );
      
      res.status(201).json(membership);
    } catch (err) {
      log(`Error creating cohort membership: ${err}`);
      res.status(400).json({ error: "Invalid cohort membership data" });
    }
  });

  // Update cohort membership role
  app.put("/api/cohort-membership/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const membershipId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!role || (role !== 'member' && role !== 'moderator')) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      // Get the membership to check the cohort
      const membership = await storage.getCohortMembershipById(membershipId);
      if (!membership) {
        return res.status(404).json({ error: "Membership not found" });
      }
      
      // Check if the requesting user is a moderator for this cohort
      const requestingUserId = req.user.id;
      const isModerator = await storage.isCohortModerator(requestingUserId, membership.cohortId);
      
      if (!isModerator && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Only moderators and admins can update membership roles" });
      }
      
      const updatedMembership = await storage.updateCohortMembershipRole(membershipId, role);
      res.json(updatedMembership);
    } catch (err) {
      log(`Error updating cohort membership: ${err}`);
      res.status(500).json({ error: "Failed to update cohort membership" });
    }
  });

  // Delete cohort membership (remove a user from a cohort)
  app.delete("/api/cohort-membership/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const membershipId = parseInt(req.params.id);
      
      // Get the membership to check the cohort
      const membership = await storage.getCohortMembershipById(membershipId);
      if (!membership) {
        return res.status(404).json({ error: "Membership not found" });
      }
      
      // Check if the requesting user is a moderator for this cohort
      const requestingUserId = req.user.id;
      const isModerator = await storage.isCohortModerator(requestingUserId, membership.cohortId);
      
      if (!isModerator && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Only moderators and admins can remove members from a cohort" });
      }
      
      const success = await storage.deleteCohortMembership(membershipId);
      res.json({ success });
    } catch (err) {
      log(`Error deleting cohort membership: ${err}`);
      res.status(500).json({ error: "Failed to delete cohort membership" });
    }
  });
  
  // Find a user by email
  app.get("/api/user/by-email", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return limited information for privacy
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName
      });
    } catch (err) {
      log(`Error finding user by email: ${err}`);
      res.status(500).json({ error: "Failed to find user" });
    }
  });

  // Create a new cohort
  app.post("/api/cohorts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { name, description } = insertCohortSchema.parse(req.body);
      const creatorId = req.user.id;
      
      log(`Creating cohort "${name}" for user ${creatorId}`);
      
      const cohort = await storage.createCohort(name, description || null, creatorId);
      
      log(`Created cohort: ${JSON.stringify(cohort)}`);
      res.status(201).json(cohort);
    } catch (err) {
      log(`Error creating cohort: ${err}`);
      res.status(400).json({ error: "Invalid cohort data" });
    }
  });

  // Get all cohorts
  app.get("/api/cohorts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const cohorts = await storage.getAllCohorts();
      res.json(cohorts);
    } catch (err) {
      log(`Error fetching all cohorts: ${err}`);
      res.status(500).json({ error: "Failed to fetch cohorts" });
    }
  });

  // Get cohorts for the current user
  app.get("/api/user/cohorts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const cohorts = await storage.getUserCohorts(userId);
      res.json(cohorts);
    } catch (err) {
      log(`Error fetching user cohorts: ${err}`);
      res.status(500).json({ error: "Failed to fetch user cohorts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}