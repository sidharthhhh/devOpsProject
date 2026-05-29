// GraphQL resolvers
const { AuthenticationError, ForbiddenError, UserInputError, ApolloError } = require('apollo-server-express');
const UserService = require('../services/userService');
const TodoService = require('../services/todoService');

const resolvers = {
  Query: {
    /**
     * Get all todos (public operation)
     */
    todos: async () => {
      try {
        return await TodoService.findAll();
      } catch (error) {
        throw new ApolloError('Failed to fetch todos', 'INTERNAL_SERVER_ERROR');
      }
    },

    /**
     * Get a specific todo by ID
     */
    todo: async (_, { id }) => {
      try {
        const todo = await TodoService.findById(id);
        return todo; // Returns null if not found
      } catch (error) {
        throw new ApolloError('Failed to fetch todo', 'INTERNAL_SERVER_ERROR');
      }
    },

    /**
     * Get todos for authenticated user (protected operation)
     */
    myTodos: async (_, __, context) => {
      // Check authentication
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      try {
        return await TodoService.findByUserId(context.user.id);
      } catch (error) {
        throw new ApolloError('Failed to fetch user todos', 'INTERNAL_SERVER_ERROR');
      }
    }
  },

  Mutation: {
    /**
     * Register a new user (public operation)
     */
    register: async (_, { name, email, password }) => {
      try {
        const result = await UserService.register(name, email, password);
        return result; // { user, token }
      } catch (error) {
        // Handle specific error types
        if (error.message.includes('Email already registered')) {
          throw new UserInputError(error.message, {
            field: 'email'
          });
        }
        if (error.message.includes('required') || error.message.includes('must be')) {
          throw new UserInputError(error.message);
        }
        throw new ApolloError('Registration failed', 'INTERNAL_SERVER_ERROR');
      }
    },

    /**
     * Login an existing user (public operation)
     */
    login: async (_, { email, password }) => {
      try {
        const result = await UserService.login(email, password);
        return result; // { user, token }
      } catch (error) {
        // Return generic authentication error for security
        if (error.message.includes('Invalid credentials')) {
          throw new AuthenticationError('Invalid credentials');
        }
        throw new ApolloError('Login failed', 'INTERNAL_SERVER_ERROR');
      }
    },

    /**
     * Create a new todo (protected operation)
     */
    createTodo: async (_, { title, description }, context) => {
      // Check authentication
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      try {
        const todo = await TodoService.create(context.user.id, title, description);
        return todo;
      } catch (error) {
        if (error.message.includes('required') || error.message.includes('empty')) {
          throw new UserInputError(error.message, {
            field: 'title'
          });
        }
        throw new ApolloError('Failed to create todo', 'INTERNAL_SERVER_ERROR');
      }
    },

    /**
     * Update an existing todo (protected operation)
     */
    updateTodo: async (_, { id, title, description, completed }, context) => {
      // Check authentication
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      try {
        // Build updates object with only provided fields
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (completed !== undefined) updates.completed = completed;

        const todo = await TodoService.update(id, context.user.id, updates);
        return todo;
      } catch (error) {
        // Handle specific error types
        if (error.message.includes('not found')) {
          throw new ApolloError('Todo not found', 'NOT_FOUND', { id });
        }
        if (error.message.includes('Not authorized')) {
          throw new ForbiddenError('Not authorized to update this todo');
        }
        if (error.message.includes('empty')) {
          throw new UserInputError(error.message, {
            field: 'title'
          });
        }
        throw new ApolloError('Failed to update todo', 'INTERNAL_SERVER_ERROR');
      }
    },

    /**
     * Delete a todo (protected operation)
     */
    deleteTodo: async (_, { id }, context) => {
      // Check authentication
      if (!context.user) {
        throw new AuthenticationError('Not authenticated');
      }

      try {
        const todo = await TodoService.delete(id, context.user.id);
        return todo;
      } catch (error) {
        // Handle specific error types
        if (error.message.includes('not found')) {
          throw new ApolloError('Todo not found', 'NOT_FOUND', { id });
        }
        if (error.message.includes('Not authorized')) {
          throw new ForbiddenError('Not authorized to delete this todo');
        }
        throw new ApolloError('Failed to delete todo', 'INTERNAL_SERVER_ERROR');
      }
    }
  }
};

module.exports = resolvers;
