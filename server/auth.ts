import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import bcrypt from 'bcryptjs';
import { storage } from "./storage";
import { User as SelectUser } from  "../shared/schema";

const saltRounds = 10;

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  return await bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express) {
  // Initialize passport without session
  app.use(passport.initialize());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        let user;
        if (username.includes('@')) {
          user = await storage.getUserByEmail(username);
        } else {
          user = await storage.getUserByUsername(username);
        }
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid credentials" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  // FIXED: Remove session-related code completely
  // FIXED: Simplified authentication routes

  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const { email, username, password, displayName } = req.body;
      
      if (!email || !username || !password || !displayName) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        email,
        username,
        displayName,
        password: await hashPassword(password),
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ 
        message: error.message || "Registration failed" 
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      
      res.status(200).json({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      });
    })(req, res, next);
  });

  // FIXED: Remove logout functionality since we're not using sessions
  // FIXED: Remove /api/user endpoint for now
  
  // FIXED: COMPLETELY REMOVE THE PROBLEMATIC AUTH MIDDLEWARE
}
