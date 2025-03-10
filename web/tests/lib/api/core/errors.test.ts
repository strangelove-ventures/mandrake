/**
 * Tests for API error handling
 */
import { describe, test, expect } from 'bun:test';
import { ApiError, isApiError, getErrorMessage } from '@/lib/api/core/errors';

describe('API Errors', () => {
  describe('ApiError', () => {
    test('should create error with correct properties', () => {
      // Arrange
      const status = 404;
      const errorData = { error: 'Not found', status: 404 };
      
      // Act
      const error = new ApiError(status, errorData);
      
      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.name).toBe('ApiError');
      expect(error.status).toBe(status);
      expect(error.data).toBe(errorData);
      expect(error.message).toContain('404');
      expect(error.message).toContain('Not found');
    });
  });
  
  describe('isApiError', () => {
    test('should identify ApiError instances', () => {
      // Arrange
      const apiError = new ApiError(500, { error: 'Server error' });
      const regularError = new Error('Regular error');
      const notAnError = 'string';
      
      // Act & Assert
      expect(isApiError(apiError)).toBe(true);
      expect(isApiError(regularError)).toBe(false);
      expect(isApiError(notAnError)).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
    });
  });
  
  describe('getErrorMessage', () => {
    test('should extract error message from different error types', () => {
      // Arrange
      const apiError = new ApiError(404, { error: 'API error message' });
      const regularError = new Error('Regular error message');
      const stringError = 'String error message';
      
      // Act & Assert
      expect(getErrorMessage(apiError)).toBe('API error message');
      expect(getErrorMessage(regularError)).toBe('Regular error message');
      expect(getErrorMessage(stringError)).toBe('String error message');
      expect(getErrorMessage(null)).toBe('Unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('Unknown error occurred');
      expect(getErrorMessage(123)).toBe('Unknown error occurred');
      expect(getErrorMessage({})).toBe('Unknown error occurred');
    });
  });
});