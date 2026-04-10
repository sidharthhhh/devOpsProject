import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';
import { env } from '../config/env';

/**
 * Global error-handling middleware.
 * Must be registered AFTER all routes.
 */
export function errorMiddleware(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Default to 500 Internal Server Error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Malformed JSON body
    statusCode = 400;
    message = 'Invalid JSON payload';
  }

  // Log the error
  logger.error(err.message, {
    statusCode,
    stack: err.stack,
    ...(err instanceof AppError ? { isOperational: err.isOperational } : {}),
  });

  // In development, expose stack trace
  if (env.NODE_ENV === 'development') {
    errors = { stack: err.stack };
  }

  sendError(res, message, statusCode, errors);
}
