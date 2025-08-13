import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Create connection pool with enhanced SSL configuration
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase
    sslmode: 'require' // Explicitly require SSL
  },
  connectionTimeoutMillis: 10000, // 10 seconds timeout
});

// Add connection event listeners for debugging
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

export const db = drizzle(pool);
