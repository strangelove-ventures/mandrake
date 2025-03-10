/**
 * API error handling
 */
import { ErrorResponse } from '@mandrake/utils/dist/types/api';

/**
 * Standardized API error class with rich error information
 */
export class ApiError extends Error {
  /** HTTP status code */
  status: number;
  /** Error response data */
  data: ErrorResponse;
  
  constructor(status: number, data: ErrorResponse) {
    const message = `API Error ${status}: ${data.error}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Safely gets a readable message from any error object
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.data.error;
  } else if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'Unknown error occurred';
  }
}