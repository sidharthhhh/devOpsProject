import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { ApiResponse } from '../utils/response';
import { AppError } from '../types/errors';

export * from '../types/errors';

interface ErrorLog {
  err: Error;
  method: string;
  url: string;
  ip: string | undefined;
  userAgent?: string;
}

const logError = (errorLog: ErrorLog): void => {
  const { err, method, url, ip, userAgent } = errorLog;

  if (err instanceof AppError && err.isOperational) {
    logger.warn({
      err,
      method,
      url,
      ip,
      userAgent,
      statusCode: err.statusCode,
    }, 'Operational error');
  } else {
    logger.error({
      err,
      method,
      url,
      ip,
      userAgent,
    }, 'Unexpected error');
  }
};

const handleMulterError = (error: MulterError): { statusCode: number; message: string } => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return { statusCode: 400, message: 'File size exceeds the maximum allowed limit' };
    case 'LIMIT_FILE_COUNT':
      return { statusCode: 400, message: 'Too many files uploaded' };
    case 'LIMIT_UNEXPECTED_FILE':
      return { statusCode: 400, message: 'Unexpected file field' };
    default:
      return { statusCode: 400, message: error.message };
  }
};

const handleZodError = (error: ZodError) => {
  const errors = error.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
    code: e.code,
  }));
  
  return {
    statusCode: 400,
    message: 'Validation failed',
    details: errors,
  };
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logError({
    err,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Handle Multer errors
  if (err instanceof MulterError) {
    const { statusCode, message } = handleMulterError(err);
    res.status(statusCode).json(ApiResponse.error(message));
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const { statusCode, message, details } = handleZodError(err);
    res.status(statusCode).json(ApiResponse.error(message, details));
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      ApiResponse.error(err.message, err.details)
    );
    return;
  }

  // Handle file type errors from multer fileFilter
  if (err.message && err.message.includes('File type')) {
    res.status(400).json(ApiResponse.error(err.message));
    return;
  }

  // Handle unknown errors
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : err.message;
    
  res.status(500).json(ApiResponse.error(message));
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json(
    ApiResponse.error(`Route ${req.method} ${req.path} not found`)
  );
};

export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
