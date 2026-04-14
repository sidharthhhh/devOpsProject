import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format for console output.
 */
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

/**
 * Winston logger instance.
 * - Console transport with colorized output in development.
 * - JSON format in production for structured log ingestion.
 */
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  ),
  defaultMeta: { service: 'node-backend-template' },
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'production'
          ? combine(timestamp(), winston.format.json())
          : combine(colorize(), consoleFormat),
    }),
  ],
});

/**
 * Security event logging functions
 */
export const securityLogger = {
  logRegistration: (email: string, username: string, success: boolean, metadata?: any) => {
    logger.info('User registration attempt', {
      event: 'registration',
      email,
      username,
      success,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  },

  logLogin: (email: string, success: boolean, metadata?: any) => {
    logger.info('User login attempt', {
      event: 'login',
      email,
      success,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  },

  logLogout: (userId: number, metadata?: any) => {
    logger.info('User logout', {
      event: 'logout',
      userId,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  },
};
