// Global Error Types and Classes

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: unknown) {
    super(400, message, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(401, message, true, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(403, message, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found', details?: unknown) {
    super(404, message, true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super(409, message, true, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation Error', details?: unknown) {
    super(422, message, true, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error', details?: unknown) {
    super(500, message, false, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database Error', details?: unknown) {
    super(500, message, false, details);
  }
}

export class StorageError extends AppError {
  constructor(message = 'Storage Error', details?: unknown) {
    super(500, message, false, details);
  }
}

export class FileNotFoundError extends NotFoundError {
  constructor(fileId: string) {
    super(`File not found: ${fileId}`, { fileId });
  }
}
