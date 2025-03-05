import { describe, test, expect } from 'bun:test';
import { createActiveModelRoutes, createModelRoutes } from '@/server/api/factories/models';

describe('Models Routes Factory', () => {
  test('should create route handlers for createActiveModelRoutes', () => {
    const routes = createActiveModelRoutes(true);
    
    // Verify the route handlers exist
    expect(routes.GET).toBeInstanceOf(Function);
    expect(routes.PUT).toBeInstanceOf(Function);
  });
  
  test('should create route handlers for createModelRoutes', () => {
    const routes = createModelRoutes(false);
    
    // Verify the route handlers exist
    expect(routes.GET).toBeInstanceOf(Function);
    expect(routes.POST).toBeInstanceOf(Function);
    expect(routes.PUT).toBeInstanceOf(Function);
    expect(routes.DELETE).toBeInstanceOf(Function);
  });
});
