/**
 * Tests for workspace routes factory
 */
import { describe, test, expect } from 'bun:test';
import { 
  createWorkspacesRoutes,
  createWorkspaceAdoptRoutes
} from '@/server/api/factories/workspaces';

describe('Workspace Routes Factory', () => {
  describe('Workspace Routes', () => {
    test('should create route handlers for workspace routes', () => {
      const routes = createWorkspacesRoutes();
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
      expect(routes.POST).toBeInstanceOf(Function);
      expect(routes.PUT).toBeInstanceOf(Function);
      expect(routes.DELETE).toBeInstanceOf(Function);
    });
  });
  
  describe('Workspace Adopt Routes', () => {
    test('should create route handler for workspace adoption', () => {
      const routes = createWorkspaceAdoptRoutes();
      
      // Verify the route handler exists
      expect(routes.POST).toBeInstanceOf(Function);
    });
  });
});
