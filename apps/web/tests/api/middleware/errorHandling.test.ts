import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import { ApiError, ErrorCode, handleApiError } from '@/server/api/middleware/errorHandling';

describe('Error Handling Middleware', () => {
  describe('ApiError', () => {
    it('should create an ApiError with default values', () => {
      const error = new ApiError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.status).toBe(500);
      expect(error.name).toBe('ApiError');
    });

    it('should create an ApiError with custom values', () => {
      const error = new ApiError('Not found', ErrorCode.RESOURCE_NOT_FOUND, 404);
      expect(error.message).toBe('Not found');
      expect(error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(error.status).toBe(404);
    });

    it('should create an ApiError with a cause', () => {
      const cause = new Error('Original error');
      const error = new ApiError('Wrapped error', ErrorCode.INTERNAL_ERROR, 500, cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('handleApiError', () => {
    it('should handle ApiError instances', async () => {
      const error = new ApiError('Test error', ErrorCode.BAD_REQUEST, 400);
      const response = handleApiError(error);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(data.error.message).toBe('Test error');
    });

    it('should handle standard Error instances', async () => {
      const error = new Error('Standard error');
      const response = handleApiError(error);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(data.error.message).toBe('Standard error');
    });

    it('should handle not found errors', async () => {
      const error = new Error('Resource not found');
      const response = handleApiError(error);
      
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      const response = handleApiError(error);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should handle non-Error objects', async () => {
      const error = 'String error';
      const response = handleApiError(error);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(data.error.message).toBe('String error');
    });
  });
});