// Database connection and query execution
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db = null;

/**
 * Initialize database connection
 * @param {string} dbPath - Path to SQLite database file
 * @returns {Database} - SQLite database instance
 */
function initializeDatabase(dbPath = process.env.DATABASE_URL || './database.sqlite') {
  try {
    // Create database connection
    db = new Database(dbPath, { verbose: console.log });
    
    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');
    
    // Initialize schema if tables don't exist
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    
    console.log(`Database connected: ${dbPath}`);
    return db;
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw new Error(`Failed to initialize database: ${error.message}`);
  }
}

/**
 * Get database instance
 * @returns {Database} - SQLite database instance
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Execute a raw SQL query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Object} - Query result
 */
function query(sql, params = []) {
  try {
    const database = getDatabase();
    
    // Determine query type
    const queryType = sql.trim().toUpperCase().split(' ')[0];
    
    if (queryType === 'SELECT') {
      // For SELECT queries, return all rows
      const stmt = database.prepare(sql);
      return stmt.all(...params);
    } else if (queryType === 'INSERT') {
      // For INSERT queries, return the inserted row info
      const stmt = database.prepare(sql);
      const info = stmt.run(...params);
      return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
    } else if (queryType === 'UPDATE' || queryType === 'DELETE') {
      // For UPDATE/DELETE queries, return affected rows count
      const stmt = database.prepare(sql);
      const info = stmt.run(...params);
      return { changes: info.changes };
    } else {
      // For other queries, execute and return result
      const stmt = database.prepare(sql);
      return stmt.run(...params);
    }
  } catch (error) {
    console.error('Query execution error:', error.message);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw new Error(`Query failed: ${error.message}`);
  }
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    try {
      db.close();
      db = null;
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database:', error.message);
      throw error;
    }
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  query,
  closeDatabase
};
