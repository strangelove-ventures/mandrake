import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createModelRoutes } from '@/lib/api/factories/createModelRoutes';
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

describe('createModelRoutes', () => {
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
      const routes = createModelRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req);
      const body = await response.json();
      
      expect(response.status).toBe(501); // Not implemented yet
      expect(body.success).toBe(false);
    });
  });

  describe('Workspace-level routes', () => {
    it('GET should list workspace models', async () => {
      const routes = createModelRoutes(true);
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { id: workspaceId } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(Object.keys(body.data).length).toBeGreaterThan(0);
    });
    
    it('GET should list workspace providers with providers path', async () => {
      const routes = createModelRoutes(true);
      const req = createMockRequest('GET', undefined, 'http://localhost/api/workspaces/test-workspace/providers');
      
      const response = await routes.GET(req, { 
        params: { id: workspaceId } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(Object.keys(body.data).length).toBeGreaterThan(0);
    });
    
    it('GET should return the active model ID', async () => {
      const routes = createModelRoutes(true);
      const req = createMockRequest('GET', undefined, 'http://localhost/api/workspaces/test-workspace/models/active?active=true');
      
      const response = await routes.GET(req, { 
        params: { id: workspaceId } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.activeModelId).toBeDefined();
    });

    it('GET should return model details when modelId is provided', async () => {
      // First get the list of models
      const models = await workspaceManager.models.listModels();
      const modelId = Object.keys(models)[0];
      
      if (modelId) {
        const routes = createModelRoutes(true);
        const req = createMockRequest('GET');
        
        const response = await routes.GET(req, { 
          params: { 
            id: workspaceId,
            modelId
          } 
        });
        
        expect(response.status).toBe(200);
        
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(body.data.modelId).toBeDefined();
      }
    });
    
    it('GET should return provider details when providerId is provided', async () => {
      // First get the list of providers
      const providers = await workspaceManager.models.listProviders();
      const providerId = Object.keys(providers)[0];
      
      if (providerId) {
        const routes = createModelRoutes(true);
        const req = createMockRequest('GET');
        
        const response = await routes.GET(req, { 
          params: { 
            id: workspaceId,
            providerId
          } 
        });
        
        expect(response.status).toBe(200);
        
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(body.data.type).toBeDefined();
      }
    });

    it('PUT should return 404 for non-existent model', async () => {
      const routes = createModelRoutes(true);
      const updateData = {
        enabled: false
      };
      
      const req = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(req, { 
        params: { 
          id: workspaceId,
          modelId: 'non-existent-model' 
        } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
    
    it('PUT should return 404 for non-existent provider', async () => {
      const routes = createModelRoutes(true);
      const updateData = {
        apiKey: 'new-key'
      };
      
      const req = createMockRequest('PUT', updateData, 'http://localhost/api/workspaces/test-workspace/providers/non-existent-provider');
      
      const response = await routes.PUT(req, { 
        params: { 
          id: workspaceId,
          providerId: 'non-existent-provider' 
        } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('DELETE should return 404 for non-existent model', async () => {
      const routes = createModelRoutes(true);
      const req = createMockRequest('DELETE');
      
      const response = await routes.DELETE(req, { 
        params: { 
          id: workspaceId,
          modelId: 'non-existent-model' 
        } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
    
    it('DELETE should return 404 for non-existent provider', async () => {
      const routes = createModelRoutes(true);
      const req = createMockRequest('DELETE', undefined, 'http://localhost/api/workspaces/test-workspace/providers/non-existent-provider');
      
      const response = await routes.DELETE(req, { 
        params: { 
          id: workspaceId,
          providerId: 'non-existent-provider' 
        } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});