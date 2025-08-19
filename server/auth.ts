import express from 'express';
import passport from 'passport';
import session from 'express-session';
import memorystore from 'memorystore';
import { Strategy as LocalStrategy } from 'passport-local';
import { storage } from './storage';
import { User } from '../shared/schema';
import { insertUserSchema } from '../shared/schema';
import { z } from 'zod';

const MemoryStore = memorystore(session);

export function configureAuth(app: express.Application) {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
  }));

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.use(new LocalStrategy(
    async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        // In a real app, use bcrypt to compare hashed passwords
        if (user.password !== password) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication endpoints
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info.message });
      
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Remove password before sending user data
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post('/api/logout', (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/user', (req, res) => {
    if (req.isAuthenticated() && req.user) {
      const { password, ...userWithoutPassword } = req.user as User;
      return res.json(userWithoutPassword);
    }
    res.status(401).json({ message: 'Not authenticated' });
  });

  // ADD THIS NEW REGISTRATION ENDPOINT
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Validate request body
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      // Automatically log in the user after registration
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: 'Registration successful but automatic login failed' });
        }
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: 'Failed to register user' });
    }
  });
}
