import app from './app'; // Express app instance
import { env } from './config/env'; // Environment configuration
import { testConnection } from './config/database'; // Database connection test
import { logger } from './utils/logger'; // Winston logger

async function bootstrap(): Promise<void> {
  try {
    // Test database connection on startup
    await testConnection();

    app.listen(env.PORT, () => {
      logger.info(`Server is running on port ${env.PORT}`); // Log server start
      logger.info(`Environment: ${env.NODE_ENV}`); // Log current environment
      logger.info(`Health check: http://localhost:${env.PORT}/health`); // Log health check URL
    });
  } catch (error) {
    logger.error('Failed to start server', { error }); // Log startup failure
    process.exit(1); // Exit with error code
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', { reason });
  process.exit(1);
});

// Handle uncaught synchronous exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

bootstrap(); // Start the server
