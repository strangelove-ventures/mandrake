/**
 * Tests for dynamic context routes factory
 */
import { describe, test, expect } from 'bun:test';
import { createDynamicContextRoutes } from '@/lib/api/factories/dynamic';

describe('Dynamic Context Routes Factory', () => {
  test('should create route handlers for workspace-scoped routes', () => {
    const routes = createDynamicContextRoutes(true);
    
    // Verify the route handlers exist
    expect(routes.GET).toBeInstanceOf(Function);
    expect(routes.POST).toBeInstanceOf(Function);
    expect(routes.PUT).toBeInstanceOf(Function);
    expect(routes.DELETE).toBeInstanceOf(Function);
  });
  
  test('should create route handlers for system-level routes', () => {
    const routes = createDynamicContextRoutes(false);
    
    // Verify the route handlers exist
    expect(routes.GET).toBeInstanceOf(Function);
    expect(routes.POST).toBeInstanceOf(Function);
    expect(routes.PUT).toBeInstanceOf(Function);
    expect(routes.DELETE).toBeInstanceOf(Function);
  });
});
