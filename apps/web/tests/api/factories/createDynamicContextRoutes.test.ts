import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDynamicContextRoutes } from '@/lib/api/factories/createDynamicContextRoutes';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';
import * as workspaceUtils from '@/lib/api/utils/workspace';
import { DynamicContextMethodConfig } from '@mandrake/workspace';

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
  let testDir: any;
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
    it('GET should return 501 Not Implemented', async () => {
      const routes = createDynamicContextRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req);
      const body = await response.json();
      
      expect(response.status).toBe(501); // Not implemented yet
      expect(body.success).toBe(false);
    });

    it('POST should return 501 Not Implemented', async () => {
      // Create a spy on the handler to mock the response
      const addContextSpy = vi.spyOn(workspaceUtils, 'getSystemWorkspaceManager')
        .mockImplementation(() => {
          throw new Error('System-level dynamic contexts not implemented yet');
        });
      
      const routes = createDynamicContextRoutes();
      const contextData = {
        id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID format
        name: 'Test Context',
        serverId: 'server1',
        methodName: 'method1',
        params: {},
        refresh: { enabled: true } // Required field
      };
      
      const req = createMockRequest('POST', contextData);
      
      try {
        const response = await routes.POST(req);
        const body = await response.json();
        
        expect(response.status).toBe(501);
        expect(body.success).toBe(false);
      } catch (error) {
        // If the test reaches here, it's a failure of the test setup
        expect(error).toBeUndefined();
      }
    });
  });

  describe('Workspace-level routes', () => {
    it('PUT should return 404 for non-existent context', async () => {
      // Mock a specific implementation for this test
      vi.spyOn(workspaceManager.dynamic, 'get')
        .mockResolvedValue(undefined);
      
      const routes = createDynamicContextRoutes(true);
      const updateData = {
        name: 'Updated Name',
        refresh: { enabled: true }
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