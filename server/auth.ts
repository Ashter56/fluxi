import express from 'express';
import passport from 'passport';
import session from 'express-session';
import memorystore from 'memorystore';
import { Strategy as LocalStrategy } from 'passport-local';
import { User } from '../shared/schema';

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
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  }));

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // Mock user database (replace with real DB)
  const users: User[] = [
    { id: 1, username: 'test', email: 'test@example.com', displayName: 'Test User' }
  ];

  passport.use(new LocalStrategy(
    (username, password, done) => {
      const user = users.find(u => u.username === username);
      if (!user) return done(null, false, { message: 'Invalid credentials' });
      return done(null, user);
    }
  ));

  passport.serializeUser((user: User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id: number, done) => {
    const user = users.find(u => u.id === id);
    done(null, user || null);
  });

  // Authentication endpoints
  app.post('/api/login', passport.authenticate('local'), (req, res) => {
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: req.user
    });
  });

  app.post('/api/logout', (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get('/api/user', (req, res) => {
    res.json(req.user || null);
  });
}
