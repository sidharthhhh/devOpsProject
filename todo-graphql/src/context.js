// Apollo Server context function for JWT verification
const jwt = require('jsonwebtoken');
const { findById } = require('./services/userService');

/**
 * Apollo Server context function
 * Extracts and verifies JWT token from Authorization header
 * Attaches authenticated user to context if token is valid
 * 
 * @param {Object} params - Context parameters
 * @param {Object} params.req - Express request object
 * @returns {Promise<{user: Object|null}>} - Context object with user or null
 */
async function context({ req }) {
  // Extract Authorization header
  const authHeader = req.headers.authorization || '';
  
  // Check if header starts with "Bearer "
  if (!authHeader.startsWith('Bearer ')) {
    return { user: null };
  }
  
  // Extract token (remove "Bearer " prefix)
  const token = authHeader.substring(7);
  
  try {
    // Verify JWT token with secret
    const secret = process.env.JWT_SECRET || 'default-secret-key';
    const decoded = jwt.verify(token, secret);
    
    // Fetch user from database using decoded userId
    const user = findById(decoded.userId);
    
    // Return context with user
    return { user };
  } catch (error) {
    // Token verification failed (invalid, expired, or malformed)
    // Return null user instead of throwing error
    return { user: null };
  }
}

module.exports = context;
