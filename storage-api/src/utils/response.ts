export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | ErrorDetail | null;
  meta?: Record<string, unknown>;
}

export interface ErrorDetail {
  message: string;
  details?: unknown;
}

export class ApiResponse {
  static success<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
    return {
      success: true,
      data,
      error: null,
      ...(meta && { meta }),
    };
  }

  static error(message: string, details?: unknown): ApiResponse {
    if (details) {
      return {
        success: false,
        data: null,
        error: {
          message,
          details,
        },
      };
    }
    
    return {
      success: false,
      data: null,
      error: message,
    };
  }

  static paginated<T>(
    data: T,
    pagination: { page: number; limit: number; total: number; totalPages: number }
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      error: null,
      meta: { pagination },
    };
  }

  static created<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
      error: null,
    };
  }

  static noContent(): ApiResponse {
    return {
      success: true,
      data: null,
      error: null,
    };
  }
}
