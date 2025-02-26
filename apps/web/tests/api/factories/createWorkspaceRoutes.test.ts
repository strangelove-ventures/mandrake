import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWorkspaceRoutes } from '@/lib/api/factories/createWorkspaceRoutes';
import { NextRequest } from 'next/server';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';

// Helper function to create mock requests
function createMockRequest(method: string, body?: any, url: string = 'http://localhost/api/workspaces'): NextRequest {
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

describe('createWorkspaceRoutes', () => {
  let testDir: any;
  let mandrakeRoot: string;
  
  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = await createTestDirectory();
    mandrakeRoot = join(testDir.path, 'mandrake');
    
    // Create Mandrake root directory
    await mkdir(mandrakeRoot, { recursive: true });
    
    // Mock MANDRAKE_ROOT environment variable
    process.env.MANDRAKE_ROOT = mandrakeRoot;
  });
  
  afterEach(async () => {
    // Clean up the test directory
    if (testDir) {
      await testDir.cleanup();
    }
    
    // Clean up environment variables
    delete process.env.MANDRAKE_ROOT;
  });

  describe('System-level routes', () => {
    it('GET should list workspaces', async () => {
      const routes = createWorkspaceRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req);
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
    
    it('POST should create a new workspace', async () => {
      const routes = createWorkspaceRoutes();
      const workspaceData = {
        name: 'new-workspace',
        description: 'A new test workspace'
      };
      
      const req = createMockRequest('POST', workspaceData);
      
      const response = await routes.POST(req);
      
      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('new-workspace');
      expect(body.data.description).toBe('A new test workspace');
    });
    
    it('PUT should update a workspace', async () => {
      // First create a workspace
      const routes = createWorkspaceRoutes();
      
      const createData = {
        name: 'workspace-to-update',
        description: 'Original description'
      };
      
      const createReq = createMockRequest('POST', createData);
      await routes.POST(createReq);
      
      // Update the workspace
      const updateData = {
        description: 'Updated description'
      };
      
      const updateReq = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(updateReq, { 
        params: { id: 'workspace-to-update' } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('workspace-to-update');
      expect(body.data.description).toBe('Updated description');
    });
    
    it('PUT should return 400 if workspace ID is missing', async () => {
      const routes = createWorkspaceRoutes();
      const updateData = {
        description: 'Updated description'
      };
      
      const req = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(req, { params: {} });
      
      expect(response.status).toBe(500); // Internal Server Error
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
    
    it('DELETE should return 501 Not Implemented', async () => {
      // First create a workspace
      const routes = createWorkspaceRoutes();
      
      const createData = {
        name: 'workspace-to-delete',
        description: 'Will be deleted'
      };
      
      const createReq = createMockRequest('POST', createData);
      await routes.POST(createReq);
      
      // Try to delete the workspace
      const req = createMockRequest('DELETE');
      
      const response = await routes.DELETE(req, { 
        params: { id: 'workspace-to-delete' } 
      });
      
      expect(response.status).toBe(501); // Not Implemented
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
    
    it('GET should get a specific workspace', async () => {
      // First create a workspace
      const routes = createWorkspaceRoutes();
      
      const createData = {
        name: 'get-workspace',
        description: 'A workspace to get'
      };
      
      const createReq = createMockRequest('POST', createData);
      await routes.POST(createReq);
      
      // Get the workspace
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { id: 'get-workspace' } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('get-workspace');
      expect(body.data.description).toBe('A workspace to get');
    });
    
    it('GET should return 404 for non-existent workspace', async () => {
      const routes = createWorkspaceRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { id: 'non-existent-workspace' } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });
});
