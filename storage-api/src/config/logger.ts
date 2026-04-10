import pino from 'pino';
import { config } from './index';

export { config };

const isDevelopment = config.server.nodeEnv === 'development';

export const logger = pino({
  level: config.logging.level,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: config.server.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export const createChildLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};
