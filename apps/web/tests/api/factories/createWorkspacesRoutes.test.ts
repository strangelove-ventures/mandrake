import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { MandrakeManager } from '@mandrake/workspace';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { NextRequest } from 'next/server';

// Import route factories
import { createWorkspacesRoutes, createWorkspaceRoutes } from '@/lib/api/factories/createWorkspacesRoutes';

// Create a test directory utility
async function createTestDirectory(prefix: string = 'workspace-routes-test-') {
  const path = await mkdtemp(join(tmpdir(), prefix));
  return {
    path,
    cleanup: async () => {
      await rm(path, { recursive: true, force: true });
    }
  };
}

// Helper to create test requests
function createTestRequest(method: string, url: string, body?: any): NextRequest {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  
  const init: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };
  
  return new NextRequest(new URL(url, 'http://localhost'), init);
}

describe('Workspaces Routes Factory', () => {
  let testDir: { path: string; cleanup: () => Promise<void> };
  let mandrakeManager: MandrakeManager;
  
  // Set up test environment before each test
  beforeEach(async () => {
    // Create a temporary test directory
    testDir = await createTestDirectory();
    
    // Set the MANDRAKE_ROOT environment variable to our test directory
    process.env.MANDRAKE_ROOT = testDir.path;
    
    // Reset singleton instances (this is specific to our implementation)
    (global as any).mandrakeManager = undefined;
    
    // Initialize a fresh manager
    mandrakeManager = new MandrakeManager(testDir.path);
    await mandrakeManager.init();
  });
  
  // Clean up after each test
  afterEach(async () => {
    await testDir.cleanup();
    
    // Reset environment variable
    delete process.env.MANDRAKE_ROOT;
    
    // Reset singleton instances
    (global as any).mandrakeManager = undefined;
  });
  
  describe('createWorkspacesRoutes', () => {
    describe('GET', () => {
      test('should list all workspaces', async () => {
        // Create some test workspaces
        await mandrakeManager.createWorkspace('workspace1', 'Test workspace 1');
        await mandrakeManager.createWorkspace('workspace2', 'Test workspace 2');
        
        // Create the route handler
        const { GET } = createWorkspacesRoutes();
        
        // Create a test request
        const req = createTestRequest('GET', 'http://localhost/api/workspaces');
        
        // Execute the handler
        const response = await GET(req);
        
        // Validate the response
        expect(response.status).toBe(200);
        const data = await response.json();
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBe(2);
        
        // Verify workspace names
        const names = data.data.map((w: any) => w.name);
        expect(names).toContain('workspace1');
        expect(names).toContain('workspace2');
      });
    });
    
    describe('POST', () => {
      test('should create a new workspace', async () => {
        // Create the route handler
        const { POST } = createWorkspacesRoutes();
        
        // Create a test request with workspace data
        const workspaceData = {
          name: 'test-workspace-1',
          description: 'Test workspace for API routes'
        };
        const req = createTestRequest('POST', 'http://localhost/api/workspaces', workspaceData);
        
        // Execute the handler
        const response = await POST(req);
        
        // Validate the response
        expect(response.status).toBe(201);
        const data = await response.json();
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.name).toBe(workspaceData.name);
        expect(data.data.description).toBe(workspaceData.description);
        expect(data.data.id).toBeDefined();
        expect(data.data.path).toContain(workspaceData.name);
        
        // Verify workspace was actually created
        const workspaces = await mandrakeManager.listWorkspaces();
        expect(workspaces.some(w => w.name === workspaceData.name)).toBe(true);
      });
      
      test('should reject a workspace with an invalid name', async () => {
        // Create the route handler
        const { POST } = createWorkspacesRoutes();
        
        // Create a test request with invalid workspace data
        const workspaceData = {
          name: 'invalid workspace name', // Contains spaces
          description: 'Invalid workspace'
        };
        const req = createTestRequest('POST', 'http://localhost/api/workspaces', workspaceData);
        
        // Execute the handler
        const response = await POST(req);
        
        // Validate the response
        expect(response.status).toBe(400);
        const data = await response.json();
        
        // Check the error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        
        // Verify workspace was not created
        const workspaces = await mandrakeManager.listWorkspaces();
        expect(workspaces.some(w => w.name === workspaceData.name)).toBe(false);
      });
      
      test('should reject a duplicate workspace name', async () => {
        // Create a workspace first
        await mandrakeManager.createWorkspace('duplicate-workspace', 'Original workspace');
        
        // Create the route handler
        const { POST } = createWorkspacesRoutes();
        
        // Create a test request with the same name
        const workspaceData = {
          name: 'duplicate-workspace',
          description: 'Duplicate workspace'
        };
        const req = createTestRequest('POST', 'http://localhost/api/workspaces', workspaceData);
        
        // Execute the handler
        const response = await POST(req);
        
        // Validate the response
        expect(response.status).toBe(409); // Conflict
        const data = await response.json();
        
        // Check the error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      });
    });
  });
  
  describe('createWorkspaceRoutes', () => {
    let workspaceId: string;
    
    beforeEach(async () => {
      // Create a test workspace to use for the tests
      const workspace = await mandrakeManager.createWorkspace('test-workspace-routes');
      workspaceId = workspace.id;
    });
    
    describe('GET', () => {
      test('should get workspace details', async () => {
        // Create the route handler
        const { GET } = createWorkspaceRoutes();
        
        // Create a test request
        const req = createTestRequest('GET', `http://localhost/api/workspaces/${workspaceId}`);
        
        // Execute the handler with params
        const response = await GET(req, { params: { id: workspaceId } });
        
        // Validate the response
        expect(response.status).toBe(200);
        const data = await response.json();
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(workspaceId);
        expect(data.data.name).toBe('test-workspace-routes');
      });
      
      test('should return 404 for non-existent workspace', async () => {
        // Create the route handler
        const { GET } = createWorkspaceRoutes();
        
        // Create a test request
        const req = createTestRequest('GET', 'http://localhost/api/workspaces/nonexistent');
        
        // Execute the handler with params
        const response = await GET(req, { params: { id: 'nonexistent' } });
        
        // Validate the response
        expect(response.status).toBe(404);
        const data = await response.json();
        
        // Check the error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      });
    });
    
    describe('PUT', () => {
      test('should update workspace details', async () => {
        // Create the route handler
        const { PUT } = createWorkspaceRoutes();
        
        // Create a test request with update data
        const updateData = {
          description: 'Updated description'
        };
        const req = createTestRequest('PUT', `http://localhost/api/workspaces/${workspaceId}`, updateData);
        
        // Execute the handler with params
        const response = await PUT(req, { params: { id: workspaceId } });
        
        // Validate the response
        expect(response.status).toBe(200);
        const data = await response.json();
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(workspaceId);
        expect(data.data.description).toBe(updateData.description);
        
        // Verify update was applied by fetching the workspace directly
        const workspace = await mandrakeManager.getWorkspace(workspaceId);
        const config = await workspace.config.getConfig();
        expect(config.description).toBe(updateData.description);
      });
    });
    
    describe('DELETE', () => {
      test('should delete a workspace', async () => {
        // Create a workspace specifically for deletion
        const workspace = await mandrakeManager.createWorkspace('workspace-to-delete');
        const deleteId = workspace.id;
        
        // Create the route handler
        const { DELETE } = createWorkspaceRoutes();
        
        // Create a test request
        const req = createTestRequest('DELETE', `http://localhost/api/workspaces/${deleteId}`);
        
        // Execute the handler with params
        const response = await DELETE(req, { params: { id: deleteId } });
        
        // Validate the response
        expect(response.status).toBe(204);
        
        // Verify workspace no longer exists
        try {
          await mandrakeManager.getWorkspace(deleteId);
          expect.fail('Workspace should not exist');
        } catch (error) {
          // Should throw an error - this is expected
          expect(error).toBeDefined();
        }
      });
    });
  });
});
