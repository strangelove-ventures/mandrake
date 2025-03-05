import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateBody, validateParams, validateQuery } from '@/server/api/middleware/validation';
import { z } from 'zod';
import { ApiError, ErrorCode } from '@/server/api/middleware/errorHandling';

describe('Validation Middleware', () => {
  // Common test schema
  const testSchema = z.object({
    id: z.string().min(3),
    count: z.number().int().positive()
  });

  describe('validateBody', () => {
    let mockRequest: NextRequest;
    
    beforeEach(() => {
      // Create a mock request with a json method
      mockRequest = {
        json: vi.fn()
      } as unknown as NextRequest;
    });

    it('should validate a valid request body', async () => {
      const validBody = { id: 'test123', count: 5 };
      (mockRequest.json as any).mockResolvedValue(validBody);
      
      const result = await validateBody(mockRequest, testSchema);
      
      expect(result).toEqual(validBody);
      expect(mockRequest.json).toHaveBeenCalledTimes(1);
    });

    it('should throw ApiError for invalid body data', async () => {
      const invalidBody = { id: 'te', count: -5 };
      (mockRequest.json as any).mockResolvedValue(invalidBody);
      
      await expect(validateBody(mockRequest, testSchema)).rejects.toThrow(ApiError);
      
      try {
        await validateBody(mockRequest, testSchema);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).message).toContain('Validation error');
      }
    });

    it('should throw ApiError if json() fails', async () => {
      (mockRequest.json as any).mockRejectedValue(new Error('JSON parse error'));
      
      await expect(validateBody(mockRequest, testSchema)).rejects.toThrow(ApiError);
      
      try {
        await validateBody(mockRequest, testSchema);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.BAD_REQUEST);
        expect((error as ApiError).status).toBe(400);
      }
    });
  });

  describe('validateParams', () => {
    it('should validate valid params', () => {
      const validParams = { id: 'test123', count: '5' };
      const schema = z.object({ 
        id: z.string().min(3),
        count: z.coerce.number().int().positive()
      });
      
      const result = validateParams(validParams, schema);
      
      expect(result).toEqual({ id: 'test123', count: 5 });
    });

    it('should throw ApiError for invalid params', () => {
      const invalidParams = { id: 'te' };
      
      expect(() => validateParams(invalidParams, testSchema)).toThrow(ApiError);
      
      try {
        validateParams(invalidParams, testSchema);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).message).toContain('Invalid parameters');
      }
    });
  });

  describe('validateQuery', () => {
    it('should validate valid query parameters', () => {
      const schema = z.object({ 
        id: z.string().min(3),
        count: z.coerce.number().int().positive()
      });
      
      const mockRequest = {
        url: 'https://example.com?id=test123&count=5'
      } as NextRequest;
      
      const result = validateQuery(mockRequest, schema);
      
      expect(result).toEqual({ id: 'test123', count: 5 });
    });

    it('should throw ApiError for invalid query', () => {
      const mockRequest = {
        url: 'https://example.com?id=te'
      } as NextRequest;
      
      expect(() => validateQuery(mockRequest, testSchema)).toThrow(ApiError);
      
      try {
        validateQuery(mockRequest, testSchema);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).message).toContain('Invalid query parameters');
      }
    });
  });
});