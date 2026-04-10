import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

interface RequestLogData {
  method: string;
  url: string;
  ip: string | undefined;
  userAgent?: string;
  duration?: number;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  const logRequest = (): void => {
    const duration = Date.now() - startTime;
    const logData: RequestLogData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      duration,
    };

    if (res.statusCode >= 400) {
      logger.warn(logData, 'Request completed with error');
    } else {
      logger.info(logData, 'Request completed');
    }
  };

  res.on('finish', logRequest);

  next();
};
