import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDynamicContextRoutes } from '@/lib/api/factories/createDynamicContextRoutes';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';
import * as workspaceUtils from '@/lib/api/utils/workspace';

// Helper function to create mock requests
function createMockRequest(method: string, body?: any): NextRequest {
  const request = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    json: body ? () => Promise.resolve(body) : undefined,
    url: 'http://localhost/api/test',
  } as unknown as NextRequest;
  
  return request;
}

describe('createDynamicContextRoutes', () => {
  let testDir;
  let workspaceManager: WorkspaceManager;
  let workspaceId = 'test-workspace';
  
  // Spy on the workspace utils to inject our test workspace
  let getWorkspaceManagerSpy;
  
  beforeEach(async () => {
    // Create a temporary workspace for testing
    testDir = await createTestDirectory();
    workspaceManager = new WorkspaceManager(testDir.path, workspaceId);
    await workspaceManager.init('Test workspace for API testing');
    
    // Setup the workspace util spy to return our test workspace
    getWorkspaceManagerSpy = vi.spyOn(workspaceUtils, 'getWorkspaceManager')
      .mockImplementation(async (id) => {
        if (id === workspaceId) {
          return workspaceManager;
        }
        throw new Error(`Workspace not found: ${id}`);
      });
    
    // Set system workspace manager
    vi.spyOn(workspaceUtils, 'getSystemWorkspaceManager')
      .mockImplementation(() => workspaceManager);
  });
  
  afterEach(async () => {
    // Clean up
    if (testDir) {
      await testDir.cleanup();
    }
    
    // Restore all spies
    vi.restoreAllMocks();
  });

  describe('System-level routes', () => {
    it('GET should return empty array', async () => {
      const routes = createDynamicContextRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req);
      const body = await response.json();
      
      expect(response.status).toBe(501); // Not implemented yet
      expect(body.success).toBe(false);
    });

    it('POST should return 501 Not Implemented', async () => {
      const routes = createDynamicContextRoutes();
      const contextData = {
        name: 'Test Context',
        serverId: 'server1',
        methodName: 'method1',
        params: {}
      };
      
      const req = createMockRequest('POST', contextData);
      
      const response = await routes.POST(req);
      const body = await response.json();
      
      expect(response.status).toBe(501); // Not implemented yet
      expect(body.success).toBe(false);
    });
  });

  describe('Workspace-level routes', () => {
    it('GET should list workspace contexts', async () => {
      // Create a test context
      await workspaceManager.dynamic.add({
        name: 'Test Context',
        serverId: 'server1',
        methodName: 'method1',
        params: {},
        enabled: true
      });
      
      const routes = createDynamicContextRoutes(true);
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { id: workspaceId } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Test Context');
    });

    it('GET should return a specific context when contextId is provided', async () => {
      // Create a test context
      const context = await workspaceManager.dynamic.add({
        name: 'Test Context',
        serverId: 'server1',
        methodName: 'method1',
        params: {},
        enabled: true
      });
      
      const routes = createDynamicContextRoutes(true);
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { 
          id: workspaceId,
          contextId: context.id 
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(context.id);
      expect(body.data.name).toBe('Test Context');
    });

    it('POST should create a new context', async () => {
      const routes = createDynamicContextRoutes(true);
      const contextData = {
        name: 'New Context',
        serverId: 'server1',
        methodName: 'method1',
        params: { param1: 'value1' },
        enabled: true
      };
      
      const req = createMockRequest('POST', contextData);
      
      const response = await routes.POST(req, { 
        params: { id: workspaceId } 
      });
      
      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('New Context');
      expect(body.data.id).toBeDefined();
      
      // Verify it was created in the workspace
      const contexts = await workspaceManager.dynamic.list();
      expect(contexts.length).toBe(1);
      expect(contexts[0].id).toBe(body.data.id);
    });

    it('PUT should update an existing context', async () => {
      // Create a test context
      const context = await workspaceManager.dynamic.add({
        name: 'Original Name',
        serverId: 'server1',
        methodName: 'method1',
        params: {},
        enabled: true
      });
      
      const routes = createDynamicContextRoutes(true);
      const updateData = {
        name: 'Updated Name',
        params: { newParam: 'value' }
      };
      
      const req = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(req, { 
        params: { 
          id: workspaceId,
          contextId: context.id 
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(context.id);
      expect(body.data.name).toBe('Updated Name');
      
      // Verify the update persisted
      const updated = await workspaceManager.dynamic.get(context.id);
      expect(updated?.name).toBe('Updated Name');
    });

    it('DELETE should remove a context', async () => {
      // Create a test context
      const context = await workspaceManager.dynamic.add({
        name: 'To Be Deleted',
        serverId: 'server1',
        methodName: 'method1',
        params: {},
        enabled: true
      });
      
      // Verify it exists
      const beforeDelete = await workspaceManager.dynamic.list();
      expect(beforeDelete.length).toBe(1);
      
      const routes = createDynamicContextRoutes(true);
      const req = createMockRequest('DELETE');
      
      const response = await routes.DELETE(req, { 
        params: { 
          id: workspaceId,
          contextId: context.id 
        } 
      });
      
      expect(response.status).toBe(204); // No content
      
      // Verify it's gone
      const afterDelete = await workspaceManager.dynamic.list();
      expect(afterDelete.length).toBe(0);
    });

    it('PUT should return 404 for non-existent context', async () => {
      const routes = createDynamicContextRoutes(true);
      const updateData = {
        name: 'Updated Name'
      };
      
      const req = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(req, { 
        params: { 
          id: workspaceId,
          contextId: 'non-existent-id' 
        } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('DELETE should return 404 for non-existent context', async () => {
      const routes = createDynamicContextRoutes(true);
      const req = createMockRequest('DELETE');
      
      const response = await routes.DELETE(req, { 
        params: { 
          id: workspaceId,
          contextId: 'non-existent-id' 
        } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});