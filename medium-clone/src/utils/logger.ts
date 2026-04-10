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
