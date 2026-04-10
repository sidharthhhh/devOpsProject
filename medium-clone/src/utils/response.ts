import { Response } from 'express';
import { ApiResponse, PaginatedResponse, PaginationMeta } from '../types';

/**
 * Send a success response.
 */
export function sendSuccess<T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200): void {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  res.status(statusCode).json(response);
}

/**
 * Send a created (201) response.
 */
export function sendCreated<T>(res: Response, data: T, message: string = 'Resource created successfully'): void {
  sendSuccess(res, data, message, 201);
}

/**
 * Send a paginated success response.
 */
export function sendPaginated<T>(
  res: Response,
  data: T,
  pagination: PaginationMeta,
  message: string = 'Success',
): void {
  const response: PaginatedResponse<T> = {
    success: true,
    message,
    data,
    pagination,
  };
  res.status(200).json(response);
}

/**
 * Send an error response.
 */
export function sendError(res: Response, message: string, statusCode: number = 500, errors?: any): void {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
  };
  res.status(statusCode).json(response);
}
