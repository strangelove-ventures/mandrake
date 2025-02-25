import { NextResponse } from 'next/server';
import { createApiErrorResponse } from '../utils/response';

/**
 * Standard error codes for API responses
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED'
}

/**
 * Custom API error with code and status
 */
export class ApiError extends Error {
  constructor(
    message: string, 
    public code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    public status: number = 500,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handles API errors and returns appropriate responses
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return createApiErrorResponse({
      code: error.code,
      message: error.message
    }, error.status);
  }
  
  // Map known error types to appropriate responses
  if (error instanceof Error) {
    if (error.message.includes('not found') || error.name === 'NotFoundError') {
      return createApiErrorResponse({
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: error.message
      }, 404);
    }
    
    if (error.message.includes('validation') || error.name === 'ValidationError') {
      return createApiErrorResponse({
        code: ErrorCode.VALIDATION_ERROR,
        message: error.message
      }, 400);
    }
    
    if (error.message.includes('unauthorized') || error.name === 'UnauthorizedError') {
      return createApiErrorResponse({
        code: ErrorCode.UNAUTHORIZED,
        message: error.message
      }, 401);
    }
    
    if (error.message.includes('forbidden') || error.name === 'ForbiddenError') {
      return createApiErrorResponse({
        code: ErrorCode.FORBIDDEN,
        message: error.message
      }, 403);
    }
    
    if (error.message.includes('conflict') || error.name === 'ConflictError') {
      return createApiErrorResponse({
        code: ErrorCode.CONFLICT,
        message: error.message
      }, 409);
    }
    
    // Default error response
    return createApiErrorResponse({
      code: ErrorCode.INTERNAL_ERROR,
      message: error.message
    }, 500);
  }
  
  // Handle non-Error objects
  return createApiErrorResponse({
    code: ErrorCode.INTERNAL_ERROR,
    message: String(error)
  }, 500);
}