// Todo service for CRUD operations
const { query } = require('../db/connection');

/**
 * Create a new todo
 * @param {number} userId - User's ID
 * @param {string} title - Todo title
 * @param {string} description - Todo description (optional)
 * @returns {Object} - Created todo object
 */
function create(userId, title, description = null) {
  // Validate title is non-empty
  if (!title || !title.trim()) {
    throw new Error('Title is required');
  }

  // Insert todo with user_id, title, description, completed=false
  const result = query(
    'INSERT INTO todos (user_id, title, description, completed) VALUES (?, ?, ?, ?)',
    [userId, title.trim(), description, 0]
  );

  // Fetch and return the created todo
  const todos = query(
    'SELECT id, title, description, completed, user_id, created_at FROM todos WHERE id = ?',
    [result.lastInsertRowid]
  );

  return todos[0];
}

/**
 * Find all todos
 * @returns {Array} - Array of all todo objects
 */
function findAll() {
  const todos = query(
    'SELECT id, title, description, completed, user_id, created_at FROM todos'
  );

  return todos;
}

/**
 * Find todo by ID
 * @param {number} todoId - Todo's ID
 * @returns {Object|null} - Todo object or null if not found
 */
function findById(todoId) {
  const todos = query(
    'SELECT id, title, description, completed, user_id, created_at FROM todos WHERE id = ?',
    [todoId]
  );

  return todos.length > 0 ? todos[0] : null;
}

/**
 * Find all todos for a specific user
 * @param {number} userId - User's ID
 * @returns {Array} - Array of todo objects belonging to the user
 */
function findByUserId(userId) {
  const todos = query(
    'SELECT id, title, description, completed, user_id, created_at FROM todos WHERE user_id = ?',
    [userId]
  );

  return todos;
}

/**
 * Update a todo with authorization check
 * @param {number} todoId - Todo's ID
 * @param {number} userId - User's ID (for authorization)
 * @param {Object} updates - Fields to update (title, description, completed)
 * @returns {Object} - Updated todo object
 */
function update(todoId, userId, updates) {
  // Find todo by ID
  const todo = findById(todoId);

  if (!todo) {
    throw new Error('Todo not found');
  }

  // Verify ownership (authorization check)
  if (todo.user_id !== userId) {
    throw new Error('Not authorized to update this todo');
  }

  // Build update query dynamically for only specified fields
  const updateFields = [];
  const updateValues = [];

  if (updates.title !== undefined) {
    if (!updates.title || !updates.title.trim()) {
      throw new Error('Title cannot be empty');
    }
    updateFields.push('title = ?');
    updateValues.push(updates.title.trim());
  }

  if (updates.description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(updates.description);
  }

  if (updates.completed !== undefined) {
    updateFields.push('completed = ?');
    updateValues.push(updates.completed ? 1 : 0);
  }

  // If no fields to update, return current todo
  if (updateFields.length === 0) {
    return todo;
  }

  // Add todoId to values array
  updateValues.push(todoId);

  // Execute update query
  query(
    `UPDATE todos SET ${updateFields.join(', ')} WHERE id = ?`,
    updateValues
  );

  // Fetch and return updated todo
  return findById(todoId);
}

/**
 * Delete a todo with authorization check
 * @param {number} todoId - Todo's ID
 * @param {number} userId - User's ID (for authorization)
 * @returns {Object} - Deleted todo object
 */
function deleteTodo(todoId, userId) {
  // Find todo by ID
  const todo = findById(todoId);

  if (!todo) {
    throw new Error('Todo not found');
  }

  // Verify ownership (authorization check)
  if (todo.user_id !== userId) {
    throw new Error('Not authorized to delete this todo');
  }

  // Delete todo from database
  query(
    'DELETE FROM todos WHERE id = ?',
    [todoId]
  );

  // Return the deleted todo object
  return todo;
}

module.exports = {
  create,
  findAll,
  findById,
  findByUserId,
  update,
  delete: deleteTodo
};
