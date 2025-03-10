/**
 * Tests for API client exports
 */
import { test, expect } from 'bun:test';
import * as apiModule from '@/lib/api';
import { ApiClient, apiClient } from '@/lib/api/core/fetcher';
import { ApiError, isApiError } from '@/lib/api/core/errors';

test('API module exports the api object', () => {
  // Verify the main API object is defined
  expect(apiModule).toBeDefined();
  expect(apiModule.api).toBeDefined();
});

test('API client has the expected methods', () => {
  // The api client has legacy methods that we'll eventually migrate
  const api = apiModule.api;
  
  // Workspace methods
  expect(typeof api.listWorkspaces).toBe('function');
  expect(typeof api.getWorkspace).toBe('function');
  expect(typeof api.registerWorkspace).toBe('function');
  expect(typeof api.unregisterWorkspace).toBe('function');
  
  // Session methods
  expect(typeof api.listSessions).toBe('function');
  expect(typeof api.getSession).toBe('function');
  expect(typeof api.createSession).toBe('function');
  expect(typeof api.updateSession).toBe('function');
  expect(typeof api.deleteSession).toBe('function');
  
  // Config methods
  expect(typeof api.getConfig).toBe('function');
  expect(typeof api.updateConfig).toBe('function');
  
  // Streaming methods
  expect(typeof api.streamRequest).toBe('function');
});

test('API client class is properly defined', () => {
  // Verify the API client class is defined
  expect(ApiClient).toBeDefined();
  expect(typeof ApiClient).toBe('function');
  
  // Verify the default client instance
  expect(apiClient).toBeDefined();
  expect(apiClient instanceof ApiClient).toBe(true);
});

test('Error handling utilities are properly defined', () => {
  // Verify error handling utilities
  expect(ApiError).toBeDefined();
  expect(typeof ApiError).toBe('function');
  expect(typeof isApiError).toBe('function');
  
  // Verify ApiError inheritance
  const error = new ApiError(404, { error: 'Not found' });
  expect(error instanceof Error).toBe(true);
  expect(error instanceof ApiError).toBe(true);
  expect(isApiError(error)).toBe(true);
  expect(isApiError(new Error('test'))).toBe(false);
});