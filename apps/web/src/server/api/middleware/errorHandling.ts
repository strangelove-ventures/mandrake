'use server';

import { NextResponse } from 'next/server';

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
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT'
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
export function errorHandler(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      }, 
      { status: error.status }
    );
  }
  
  // Map known error types to appropriate responses
  if (error instanceof Error) {
    if (error.message.includes('not found') || error.name === 'NotFoundError') {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: error.message
          }
        }, 
        { status: 404 }
      );
    }
    
    if (error.message.includes('validation') || error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: error.message
          }
        }, 
        { status: 400 }
      );
    }
    
    if (error.message.includes('unauthorized') || error.name === 'UnauthorizedError') {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: error.message
          }
        }, 
        { status: 401 }
      );
    }
    
    if (error.message.includes('forbidden') || error.name === 'ForbiddenError') {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: error.message
          }
        }, 
        { status: 403 }
      );
    }
    
    if (error.message.includes('conflict') || error.name === 'ConflictError') {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: ErrorCode.CONFLICT,
            message: error.message
          }
        }, 
        { status: 409 }
      );
    }
    
    // Default error response
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: error.message
        }
      }, 
      { status: 500 }
    );
  }
  
  // Handle non-Error objects
  return NextResponse.json(
    { 
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: String(error)
      }
    }, 
    { status: 500 }
  );
}
