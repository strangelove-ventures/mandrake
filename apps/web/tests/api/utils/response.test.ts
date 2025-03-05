import { expect, test, describe, beforeEach } from "bun:test";
import { 
  createApiResponse, 
  createApiErrorResponse, 
  createApiStreamResponse, 
  createNoContentResponse,
  createRedirectResponse
} from '@/server/api/utils/response';
import { NextResponse } from 'next/server';

describe('API Response Utilities', () => {
  describe('createApiResponse', () => {
    test('should create a successful API response with default status code', async () => {
      const data = { id: '123', name: 'Test' };
      const response = createApiResponse(data);
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        success: true,
        data
      });
    });

    test('should create a successful API response with custom status code', async () => {
      const data = { id: '123' };
      const response = createApiResponse(data, 201);
      
      expect(response.status).toBe(201);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        success: true,
        data
      });
    });
  });

  describe('createApiErrorResponse', () => {
    test('should create an error response with string error', async () => {
      const response = createApiErrorResponse('Test error');
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        success: false,
        error: {
          code: 'ERROR',
          message: 'Test error'
        }
      });
    });

    test('should create an error response with error object', async () => {
      const error = {
        code: 'NOT_FOUND',
        message: 'Resource not found'
      };
      const response = createApiErrorResponse(error, 404);
      
      expect(response.status).toBe(404);
      
      const responseData = await response.json();
      expect(responseData).toEqual({
        success: false,
        error
      });
    });
  });

  describe('createNoContentResponse', () => {
    test('should create a 204 No Content response', () => {
      const response = createNoContentResponse();
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
    });
  });

  describe('createRedirectResponse', () => {
    let originalRedirect: any;
    
    beforeEach(() => {
      // Store original implementation
      originalRedirect = NextResponse.redirect;
      
      // Mock NextResponse.redirect to avoid the trailing slash issue
      NextResponse.redirect = (url, status) => {
        return new Response(null, {
          status: typeof status === 'number' ? status : 307,
          headers: {
            'Location': url.toString()
          }
        }) as NextResponse;
      };
    });
    
    test('should create a temporary redirect response by default', () => {
      const url = 'https://example.com';
      const response = createRedirectResponse(url);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe(url);
    });

    test('should create a permanent redirect response when specified', () => {
      const url = 'https://example.com';
      const response = createRedirectResponse(url, true);
      
      expect(response.status).toBe(308);
      expect(response.headers.get('Location')).toBe(url);
    });

    test('should handle URLs with trailing slashes', () => {
      const url = 'https://example.com/';
      const response = createRedirectResponse(url);
      
      expect(response.headers.get('Location')).toBe('https://example.com');
    });
  });

  describe('createApiStreamResponse', () => {
    test('should create a streaming response with correct headers', () => {
      // Create a mock readable stream
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue('test data');
          controller.close();
        }
      });
      
      const response = createApiStreamResponse(stream);
      
      expect(response).toBeInstanceOf(Response);
      expect(response.body).toBe(stream);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });
  });
});
