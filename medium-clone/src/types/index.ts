import { Request, Response, NextFunction } from 'express';

/**
 * Application-specific error class with HTTP status codes.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Standard API response shape.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
}

/**
 * Pagination metadata.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated API response.
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: PaginationMeta;
}

/**
 * Typed request handler to simplify controller signatures.
 */
export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;
