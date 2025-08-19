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

  // Registration endpoint with enhanced error logging
  app.post('/api/auth/register', async (req, res) => {
    console.log('Registration request received at:', new Date().toISOString());
    
    try {
      console.log('Request body:', req.body);
      
      // Validate request body
      const userData = insertUserSchema.parse(req.body);
      console.log('Validated user data:', userData);
      
      // Check if user already exists
      console.log('Checking if username exists:', userData.username);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        console.log('Username already exists:', userData.username);
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      console.log('Checking if email exists:', userData.email);
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        console.log('Email already exists:', userData.email);
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Create user
      console.log('Creating user in database...');
      const user = await storage.createUser(userData);
      console.log('User created successfully with ID:', user.id);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      // Automatically log in the user after registration
      console.log('Attempting auto-login for user ID:', user.id);
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Auto-login failed:', loginErr);
          return res.status(500).json({ message: 'Registration successful but automatic login failed' });
        }
        console.log('Auto-login successful for user ID:', user.id);
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error('Registration error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'No error name',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: 'Failed to register user' });
    }
  });

  // Add database test endpoint
  app.get('/api/auth/test-db', async (req, res) => {
    try {
      // Test if we can query the database
      const testUser = await storage.getUserByUsername('testuser');
      res.json({ 
        success: true, 
        message: 'Database connection successful',
        testUser: testUser ? 'User exists' : 'No test user found'
      });
    } catch (error) {
      console.error('Database test failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Database connection failed',
        error: error.message 
      });
    }
  });
}
