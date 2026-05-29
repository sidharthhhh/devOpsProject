// User service for authentication and user management
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');

const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @param {string} name - User's name
 * @param {string} email - User's email
 * @param {string} password - User's password (plain text)
 * @returns {Promise<{user: Object, token: string}>} - User object and JWT token
 */
async function register(name, email, password) {
  // Validate input
  if (!name || !name.trim()) {
    throw new Error('Name is required');
  }
  if (!email || !email.trim()) {
    throw new Error('Email is required');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if email already exists
  const existingUsers = query(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  
  if (existingUsers.length > 0) {
    throw new Error('Email already registered');
  }

  // Hash password with bcrypt
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // Insert user into database
  const result = query(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, password_hash]
  );

  // Fetch the created user (excluding password_hash)
  const users = query(
    'SELECT id, name, email, created_at FROM users WHERE id = ?',
    [result.lastInsertRowid]
  );

  const user = users[0];

  // Generate JWT token
  const token = generateToken(user.id);

  return { user, token };
}

/**
 * Login an existing user
 * @param {string} email - User's email
 * @param {string} password - User's password (plain text)
 * @returns {Promise<{user: Object, token: string}>} - User object and JWT token
 */
async function login(email, password) {
  // Find user by email (including password_hash for verification)
  const users = query(
    'SELECT id, name, email, password_hash, created_at FROM users WHERE email = ?',
    [email]
  );

  if (users.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = users[0];

  // Verify password with bcrypt.compare()
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Remove password_hash from user object before returning
  const { password_hash, ...userWithoutPassword } = user;

  // Generate JWT token
  const token = generateToken(user.id);

  return { user: userWithoutPassword, token };
}

/**
 * Find user by ID
 * @param {number} userId - User's ID
 * @returns {Object|null} - User object (without password_hash) or null
 */
function findById(userId) {
  const users = query(
    'SELECT id, name, email, created_at FROM users WHERE id = ?',
    [userId]
  );

  return users.length > 0 ? users[0] : null;
}

/**
 * Generate JWT token for a user
 * @param {number} userId - User's ID
 * @returns {string} - JWT token
 */
function generateToken(userId) {
  const secret = process.env.JWT_SECRET || 'default-secret-key';
  
  const payload = {
    userId: userId
  };

  // Sign token with secret
  const token = jwt.sign(payload, secret, {
    expiresIn: '7d' // Token expires in 7 days
  });

  return token;
}

module.exports = {
  register,
  login,
  findById,
  generateToken
};
