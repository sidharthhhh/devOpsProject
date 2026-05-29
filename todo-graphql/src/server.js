// Server initialization module
const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const context = require('./context');

/**
 * Initialize and configure Apollo Server with Express
 * @returns {Object} - Object containing Express app and Apollo Server instance
 */
function createServer() {
  // Create Express application
  const app = express();

  // Configure Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context,
    
    // Enable introspection and playground in development
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production',
    
    // Error formatting based on environment
    formatError: (error) => {
      // In production, hide internal error details
      if (process.env.NODE_ENV === 'production') {
        // Log full error server-side
        console.error('GraphQL Error:', error);
        
        // Return sanitized error to client
        return {
          message: error.message,
          extensions: {
            code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
          }
        };
      }
      
      // In development, return full error details
      return error;
    }
  });

  return { app, server };
}

module.exports = createServer;
