import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { log } from "./vite";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "development_secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  
  // Forgot password route - send reset link
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const data = forgotPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      
      // Always return 200 even if email doesn't exist to prevent email enumeration
      if (!user) {
        log(`Reset request for non-existent email: ${data.email}`);
        return res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." });
      }
      
      // Generate reset token
      const token = await storage.createPasswordResetToken(user.id);
      
      // TODO: In a real app, send an email with the reset link
      // For now, we just return the token in the response
      log(`Generated reset token ${token} for user ${user.id}`);
      
      res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent.",
        // In production, remove this token from the response and email it instead
        token
      });
    } catch (error) {
      log(`Error in forgot password: ${error}`);
      res.status(400).json({ error: "Invalid request" });
    }
  });
  
  // Reset password route
  app.post("/api/reset-password", async (req, res) => {
    try {
      const data = resetPasswordSchema.parse(req.body);
      const resetToken = await storage.getPasswordResetTokenByToken(data.token);
      
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(data.password);
      
      // Update the user's password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      
      // Mark the token as used
      await storage.markTokenAsUsed(resetToken.id);
      
      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      log(`Error in reset password: ${error}`);
      res.status(400).json({ error: "Invalid request" });
    }
  });
}
