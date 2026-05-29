// Main server entry point
require('dotenv').config();
const createServer = require('./server');
const { initializeDatabase } = require('./db/connection');

/**
 * Start the GraphQL server
 */
async function startServer() {
  try {
    // Load environment variables
    const PORT = process.env.PORT || 4000;
    
    // Initialize database connection
    console.log('Initializing database...');
    initializeDatabase();
    
    // Create server instances
    const { app, server } = createServer();
    
    // Start Apollo Server
    await server.start();
    
    // Apply Apollo middleware to Express
    server.applyMiddleware({ app, path: '/graphql' });
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🎮 GraphQL Playground: http://localhost:${PORT}${server.graphqlPath}`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
