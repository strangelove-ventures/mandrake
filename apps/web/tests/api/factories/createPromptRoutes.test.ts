import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPromptRoutes } from '@/lib/api/factories/createPromptRoutes';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';
import * as workspaceUtils from '@/lib/api/utils/workspace';

// Helper function to create mock requests
function createMockRequest(method: string, body?: any, url: string = 'http://localhost/api/test'): NextRequest {
  const request = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json'
    }),
    json: body ? () => Promise.resolve(body) : undefined,
    url,
  } as unknown as NextRequest;
  
  return request;
}

describe('createPromptRoutes', () => {
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
    it('GET should return 501 Not Implemented', async () => {
      const routes = createPromptRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req);
      const body = await response.json();
      
      expect(response.status).toBe(501); // Not implemented yet
      expect(body.success).toBe(false);
    });

    it('PUT should return 501 Not Implemented for config update', async () => {
      const routes = createPromptRoutes();
      const updateData = {
        instructions: 'Test instructions',
        includeSystemInfo: true,
        includeDateTime: true,
        includeWorkspaceMetadata: true
      };
      
      const req = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(req);
      const body = await response.json();
      
      expect(response.status).toBe(501); // Not implemented yet
      expect(body.success).toBe(false);
    });
  });

  describe('Workspace-level routes', () => {
    it('GET should return prompt config', async () => {
      const routes = createPromptRoutes(true);
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { id: workspaceId } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.instructions).toBeDefined();
      expect(typeof body.data.includeSystemInfo).toBe('boolean');
      expect(typeof body.data.includeDateTime).toBe('boolean');
      expect(typeof body.data.includeWorkspaceMetadata).toBe('boolean');
    });

    it('PUT should update prompt config', async () => {
      const routes = createPromptRoutes(true);
      const updateData = {
        instructions: 'Updated instructions',
        includeSystemInfo: true,
        includeDateTime: true,
        includeWorkspaceMetadata: false
      };
      
      const req = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(req, { 
        params: { id: workspaceId }
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.instructions).toBe(updateData.instructions);
      expect(body.data.includeSystemInfo).toBe(updateData.includeSystemInfo);
      expect(body.data.includeDateTime).toBe(updateData.includeDateTime);
      expect(body.data.includeWorkspaceMetadata).toBe(updateData.includeWorkspaceMetadata);
    });
  });
});