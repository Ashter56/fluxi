import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Create connection pool with SSL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { 
    rejectUnauthorized: false 
  } : false,
});

// Add connection event listeners for debugging
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

export const db = drizzle(pool);

// Test connection immediately
(async () => {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection test successful:', result.rows[0].current_time);
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
  }
})();
