import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createToolsRoutes } from '@/lib/api/factories/createToolsRoutes';
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

describe('createToolsRoutes', () => {
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
      const routes = createToolsRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req);
      const body = await response.json();
      
      expect(response.status).toBe(501); // Not implemented yet
      expect(body.success).toBe(false);
    });
  });

  describe('Workspace-level routes', () => {
    it('GET should list config sets', async () => {
      const routes = createToolsRoutes(true);
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { id: workspaceId } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toContain('default');
    });
    
    it('GET should return active config set', async () => {
      const routes = createToolsRoutes(true);
      const req = createMockRequest('GET', undefined, 'http://localhost/api/workspaces/test-workspace/tools?active=true');
      
      const response = await routes.GET(req, { 
        params: { id: workspaceId } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.active).toBe('default');
    });
    
    it('GET should return config set details', async () => {
      const routes = createToolsRoutes(true);
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { 
          id: workspaceId,
          setId: 'default'
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.ripper).toBeDefined();
      expect(body.data.ripper.command).toBe('bun');
    });
    
    it('GET should return server config', async () => {
      const routes = createToolsRoutes(true);
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { 
          id: workspaceId,
          setId: 'default',
          serverId: 'ripper'
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.command).toBe('bun');
    });

    it('POST should add a config set', async () => {
      const routes = createToolsRoutes(true);
      const configData = {
        test: {
          command: 'echo',
          args: ['test']
        }
      };
      
      const req = createMockRequest('POST', configData);
      
      const response = await routes.POST(req, { 
        params: { 
          id: workspaceId,
          setId: 'test-set'
        } 
      });
      
      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.test).toBeDefined();
      expect(body.data.test.command).toBe('echo');
      
      // Verify it was added
      const configSets = await workspaceManager.tools.listConfigSets();
      expect(configSets).toContain('test-set');
    });
    
    it('POST should add a server config', async () => {
      const routes = createToolsRoutes(true);
      const serverData = {
        command: 'echo',
        args: ['test']
      };
      
      const req = createMockRequest('POST', serverData);
      
      const response = await routes.POST(req, { 
        params: { 
          id: workspaceId,
          setId: 'default',
          serverId: 'test-server'
        } 
      });
      
      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.command).toBe('echo');
      
      // Verify it was added
      const configSet = await workspaceManager.tools.getConfigSet('default');
      expect(configSet['test-server']).toBeDefined();
    });
    
    it('PUT should update a config set', async () => {
      // First add a new config set
      await workspaceManager.tools.addConfigSet('test-set', {
        test: {
          command: 'echo',
          args: ['test']
        }
      });
      
      const routes = createToolsRoutes(true);
      const updateData = {
        test: {
          disabled: true
        }
      };
      
      const req = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(req, { 
        params: { 
          id: workspaceId,
          setId: 'test-set'
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.test.disabled).toBe(true);
      expect(body.data.test.command).toBe('echo'); // Original value preserved
    });
    
    it('DELETE should remove a config set', async () => {
      // First add a new config set
      await workspaceManager.tools.addConfigSet('test-set', {
        test: {
          command: 'echo',
          args: ['test']
        }
      });
      
      const routes = createToolsRoutes(true);
      const req = createMockRequest('DELETE');
      
      const response = await routes.DELETE(req, { 
        params: { 
          id: workspaceId,
          setId: 'test-set'
        } 
      });
      
      expect(response.status).toBe(204);
      
      // Verify it was removed
      const configSets = await workspaceManager.tools.listConfigSets();
      expect(configSets).not.toContain('test-set');
    });
    
    it('GET should return 404 for nonexistent resources', async () => {
      const routes = createToolsRoutes(true);
      const req = createMockRequest('GET');
      
      // Test nonexistent config set
      const response1 = await routes.GET(req, { 
        params: { 
          id: workspaceId,
          setId: 'nonexistent'
        } 
      });
      
      expect(response1.status).toBe(404);
      
      // Test nonexistent server
      const response2 = await routes.GET(req, { 
        params: { 
          id: workspaceId,
          setId: 'default',
          serverId: 'nonexistent'
        } 
      });
      
      expect(response2.status).toBe(404);
    });
  });
});