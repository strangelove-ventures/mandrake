/**
 * Tests for tools routes factory
 */
import { describe, test, expect } from 'bun:test';
import { 
  createToolsConfigRoutes, 
  createServerConfigRoutes,
  createActiveConfigSetRoutes,
  createServerStatusRoutes,
  createServerMethodsRoutes,
  createExecuteMethodRoutes
} from '@/lib/api/factories/tools';

describe('Tools Routes Factory', () => {
  // Test tool config routes
  describe('Tools Config Routes', () => {
    test('should create route handlers for workspace-scoped routes', () => {
      const routes = createToolsConfigRoutes(true);
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
      expect(routes.POST).toBeInstanceOf(Function);
      expect(routes.DELETE).toBeInstanceOf(Function);
    });
    
    test('should create route handlers for system-level routes', () => {
      const routes = createToolsConfigRoutes(false);
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
      expect(routes.POST).toBeInstanceOf(Function);
      expect(routes.DELETE).toBeInstanceOf(Function);
    });
  });

  // Test server config routes
  describe('Server Config Routes', () => {
    test('should create route handlers for workspace-scoped routes', () => {
      const routes = createServerConfigRoutes(true);
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
      expect(routes.POST).toBeInstanceOf(Function);
      expect(routes.PUT).toBeInstanceOf(Function);
      expect(routes.DELETE).toBeInstanceOf(Function);
    });
    
    test('should create route handlers for system-level routes', () => {
      const routes = createServerConfigRoutes(false);
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
      expect(routes.POST).toBeInstanceOf(Function);
      expect(routes.PUT).toBeInstanceOf(Function);
      expect(routes.DELETE).toBeInstanceOf(Function);
    });
  });

  // Test active config set routes
  describe('Active Config Set Routes', () => {
    test('should create route handlers for workspace-scoped routes', () => {
      const routes = createActiveConfigSetRoutes(true);
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
      expect(routes.PUT).toBeInstanceOf(Function);
    });
    
    test('should create route handlers for system-level routes', () => {
      const routes = createActiveConfigSetRoutes(false);
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
      expect(routes.PUT).toBeInstanceOf(Function);
    });
  });

  // Test server status routes
  describe('Server Status Routes', () => {
    test('should create route handlers for workspace-scoped routes', () => {
      const routes = createServerStatusRoutes(true);
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
    });
    
    test('should create route handlers for system-level routes', () => {
      const routes = createServerStatusRoutes(false);
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
    });
  });

  // Test server methods routes
  describe('Server Methods Routes', () => {
    test('should create route handlers for workspace-scoped routes', () => {
      const routes = createServerMethodsRoutes(true);
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
    });
    
    test('should create route handlers for system-level routes', () => {
      const routes = createServerMethodsRoutes(false);
      
      // Verify the route handlers exist
      expect(routes.GET).toBeInstanceOf(Function);
    });
  });

  // Test execute method routes
  describe('Execute Method Routes', () => {
    test('should create route handlers for workspace-scoped routes', () => {
      const routes = createExecuteMethodRoutes(true);
      
      // Verify the route handlers exist
      expect(routes.POST).toBeInstanceOf(Function);
    });
    
    test('should create route handlers for system-level routes', () => {
      const routes = createExecuteMethodRoutes(false);
      
      // Verify the route handlers exist
      expect(routes.POST).toBeInstanceOf(Function);
    });
  });
});
