/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for API client functionality 
 */
import { test, expect } from 'bun:test';
import { ApiClient } from '@/lib/api/core/fetcher';
import { ApiError } from '@/lib/api/core/errors';

test('ApiClient constructs with default values', () => {
  // Create client with defaults
  const client = new ApiClient();
  
  // Create a test URL to verify base URL setting
  // We can test this by accessing private properties using type assertion
  const baseUrl = (client as any).baseUrl;
  
  // In browser, default should be '/api'
  // In Node.js, default should be 'http://localhost:4000'
  expect(baseUrl === '/api' || baseUrl === 'http://localhost:4000').toBe(true);
});

test('ApiClient constructs with custom values', () => {
  // Create client with custom base URL
  const client = new ApiClient({ 
    baseUrl: 'https://custom-api.example.com',
    defaultHeaders: {
      'X-API-Key': 'test-key'
    }
  });
  
  // Verify custom values using type assertion
  const baseUrl = (client as any).baseUrl;
  const headers = (client as any).defaultHeaders;
  
  expect(baseUrl).toBe('https://custom-api.example.com');
  expect(headers).toHaveProperty('X-API-Key', 'test-key');
});

test('createUrl generates correct URLs', () => {
  const client = new ApiClient({ baseUrl: 'https://api.example.com' });
  
  // Test without workspace ID
  expect(client.createUrl('/test')).toBe('/test');
  expect(client.createUrl('test')).toBe('test');
  
  // Test with workspace ID
  expect(client.createUrl('/test', 'workspace-1')).toBe('/workspaces/workspace-1/test');
  expect(client.createUrl('test', 'workspace-1')).toBe('/workspaces/workspace-1/test');
  
  // Test with nested path
  expect(client.createUrl('/test/nested', 'workspace-1')).toBe('/workspaces/workspace-1/test/nested');
});

test('ApiError captures error details', () => {
  // Create an API error
  const status = 404;
  const errorData = { error: 'Resource not found', status: 404 };
  const error = new ApiError(status, errorData);
  
  // Verify properties
  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe('ApiError');
  expect(error.status).toBe(status);
  expect(error.data).toBe(errorData);
  expect(error.message).toContain('404');
  expect(error.message).toContain('Resource not found');
});