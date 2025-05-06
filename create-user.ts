// Simple script to create a user directly in the database
// Run with: npx tsx create-user.ts

import { pool } from './server/db';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// User data to create
const userToCreate = {
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  password: 'password123',
  avatarUrl: 'https://ui-avatars.com/api/?name=Test+User&background=random'
};

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function createUser() {
  try {
    // Check if user exists
    const existingUserRes = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [userToCreate.username, userToCreate.email]
    );
    
    if (existingUserRes.rows.length > 0) {
      console.log('User already exists. Skipping creation.');
      return;
    }

    // Hash the password
    const hashedPassword = await hashPassword(userToCreate.password);
    
    // Create the user
    const result = await pool.query(
      `INSERT INTO users (username, email, display_name, password, avatar_url, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id, username, email, display_name, avatar_url`,
      [
        userToCreate.username,
        userToCreate.email,
        userToCreate.displayName,
        hashedPassword,
        userToCreate.avatarUrl
      ]
    );
    
    console.log('User created successfully:');
    console.log(result.rows[0]);
    
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

createUser();