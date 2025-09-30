import express from 'express';
import passport from 'passport';
import session from 'express-session';
import memorystore from 'memorystore';
import { Strategy as LocalStrategy } from 'passport-local';
import { storage } from './storage';
import { User } from '../shared/schema';

const MemoryStore = memorystore(session);

export function setupAuth(app: express.Application) {
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

  // Handle both /api/auth/register and /api/register for compatibility
  const handleRegister = async (req: express.Request, res: express.Response) => {
    console.log("Registration request received at:", new Date().toISOString());
    console.log("Request body:", req.body);
    
    try {
      const { email, username, displayName, password } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log("Registration failed: username already exists");
        return res.status(400).json({ message: 'Username already exists' });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        console.log("Registration failed: email already exists");
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Create user
      console.log("Creating user in database...");
      const user = await storage.createUser({
        email,
        username,
        displayName,
        password,
        avatarUrl: null,
        bio: null
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      console.log("User created successfully with ID:", user.id);
      
      // Auto-login after registration
      req.logIn(user, (err) => {
        if (err) {
          console.error("Auto-login error:", err);
          return res.status(500).json({ message: 'Registration successful but auto-login failed' });
        }
        
        console.log("Auto-login successful for user ID:", user.id);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Register both routes
  app.post('/api/auth/register', handleRegister);
  app.post('/api/register', handleRegister);

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
}
