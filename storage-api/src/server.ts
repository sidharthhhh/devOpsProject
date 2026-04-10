import { createApp } from './app';
import { config } from './config/logger';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './database/mysql';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const app = createApp();

    const server = app.listen(config.server.port, () => {
      logger.info(
        {
          port: config.server.port,
          nodeEnv: config.server.nodeEnv,
          corsOrigin: config.server.corsOrigin,
        },
        'Server started'
      );
    });

    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'Received shutdown signal');

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectDatabase();
          logger.info('Database connection closed');

          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, 'Error during shutdown');
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
      logger.error({ err: error }, 'Uncaught exception');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled rejection');
      process.exit(1);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
