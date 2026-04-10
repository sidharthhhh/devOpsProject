import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/logger';
import { requestLogger } from './middlewares/request-logger.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import fileRoutes from './modules/file/file.routes';
import { ApiResponse } from './utils/response';

export const createApp = (): Express => {
  const app = express();

  app.use(cors({ origin: config.server.corsOrigin }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    res.json(ApiResponse.success({ status: 'healthy', timestamp: new Date().toISOString() }));
  });

  app.get('/', (_req, res) => {
    res.json(
      ApiResponse.success({
        name: 'Storage API',
        version: '1.0.0',
        description: 'Production-grade file storage API',
      })
    );
  });

  app.use('/api/files', fileRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
