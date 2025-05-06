// Simple script to create a user directly in the database
// Run with: node create-user.js

const { pool } = require('./server/db');
const crypto = require('crypto');
const util = require('util');

const scryptAsync = util.promisify(crypto.scrypt);

// User data to create
const userToCreate = {
  username: 'admin',
  email: 'admin@example.com',
  displayName: 'Admin User',
  password: 'password123',
  avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=random'
};

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
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
      `INSERT INTO users (username, email, "displayName", password, "avatarUrl", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
       RETURNING id, username, email, "displayName", "avatarUrl"`,
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