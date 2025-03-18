import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertBabySchema, insertPostSchema } from "@shared/schema";
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

  app.get("/api/cohort/:id/posts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const cohortId = parseInt(req.params.id);
      log(`Fetching posts for cohort ${cohortId}`);

      const posts = await storage.getPostsByCohort(cohortId);
      log(`Found ${posts.length} posts`);

      const postsWithUsers = await Promise.all(
        posts.map(async (post) => {
          const user = await storage.getUser(post.userId);
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

  const httpServer = createServer(app);
  return httpServer;
}