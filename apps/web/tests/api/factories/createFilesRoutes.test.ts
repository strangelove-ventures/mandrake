import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFilesRoutes } from '@/lib/api/factories/createFilesRoutes';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';
import * as workspaceUtils from '@/lib/api/utils/workspace';
import { FilesHandler } from '@/lib/api/handlers/FilesHandler';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

// Helper function to create mock requests
function createMockRequest(method: string, body?: any, url: string = 'http://localhost/api/workspaces/test-workspace/files'): NextRequest {
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

describe('createFilesRoutes', () => {
  let testDir: any;
  let workspaceManager: WorkspaceManager;
  let workspaceId = 'test-workspace';
  let filesHandler: FilesHandler;
  
  // Spy on the workspace utils to inject our test workspace
  let getWorkspaceManagerSpy;
  
  beforeEach(async () => {
    // Create a temporary workspace for testing
    testDir = await createTestDirectory();
    workspaceManager = new WorkspaceManager(testDir.path, workspaceId);
    await workspaceManager.init('Test workspace for API testing');
    
    // Create the files directory structure
    const filesDir = join(testDir.path, 'test-workspace', '.ws', 'files');
    await workspaceManager.files.init();
    
    // Create a file handler instance for direct file operations
    filesHandler = new FilesHandler(workspaceId, workspaceManager);
    
    // Setup the workspace util spy to return our test workspace
    getWorkspaceManagerSpy = vi.spyOn(workspaceUtils, 'getWorkspaceManager')
      .mockImplementation(async (id) => {
        if (id === workspaceId) {
          return workspaceManager;
        }
        throw new Error(`Workspace not found: ${id}`);
      });
  });
  
  afterEach(async () => {
    // Clean up
    if (testDir) {
      await testDir.cleanup();
    }
    
    // Restore all spies
    vi.restoreAllMocks();
  });

  describe('Workspace-level routes', () => {
    it('GET should list files', async () => {
      // Create file directly to ensure it exists
      const filesDir = join(testDir.path, 'test-workspace', '.ws', 'files');
      await writeFile(join(filesDir, 'test-file.txt'), 'Test content');
      
      // Verify file exists
      const fileContent = await readFile(join(filesDir, 'test-file.txt'), 'utf-8');
      console.log('File content:', fileContent);
      
      // Use the handler to verify file exists in API
      const filesList = await filesHandler.listFiles();
      console.log('Files from handler:', filesList);
      
      const routes = createFilesRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { id: workspaceId } 
      });
      
      const body = await response.json();
      console.log('Response from routes:', body);
      
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('test-file.txt');
    });
    
    it('GET should filter by active status', async () => {
      // Create an active and inactive file using the handler
      const activeReq = createMockRequest('POST', { content: 'Active content', active: true });
      const inactiveReq = createMockRequest('POST', { content: 'Inactive content', active: false });
      
      await filesHandler.createFile('active-file.txt', activeReq);
      await filesHandler.createFile('inactive-file.txt', inactiveReq);
      
      const routes = createFilesRoutes();
      
      // Get active files
      const activeGetReq = createMockRequest('GET', undefined, 'http://localhost/api/workspaces/test-workspace/files?active=true');
      const activeResponse = await routes.GET(activeGetReq, { 
        params: { id: workspaceId } 
      });
      
      const activeBody = await activeResponse.json();
      expect(activeBody.data.length).toBe(1);
      expect(activeBody.data[0].name).toBe('active-file.txt');
      
      // Get inactive files
      const inactiveGetReq = createMockRequest('GET', undefined, 'http://localhost/api/workspaces/test-workspace/files?active=false');
      const inactiveResponse = await routes.GET(inactiveGetReq, { 
        params: { id: workspaceId } 
      });
      
      const inactiveBody = await inactiveResponse.json();
      expect(inactiveBody.data.length).toBe(1);
      expect(inactiveBody.data[0].name).toBe('inactive-file.txt');
    });
    
    it('GET should get a specific file', async () => {
      // First create a file using the handler
      const createReq = createMockRequest('POST', { content: 'File content' });
      await filesHandler.createFile('get-file.txt', createReq);
      
      const routes = createFilesRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { 
          id: workspaceId,
          fileName: 'get-file.txt'
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('get-file.txt');
      expect(body.data.content).toBe('File content');
      expect(body.data.active).toBe(true);
    });

    it('POST should create a new file', async () => {
      const routes = createFilesRoutes();
      const fileData = {
        content: 'New file content',
        active: true
      };
      
      const req = createMockRequest('POST', fileData);
      
      const response = await routes.POST(req, { 
        params: { 
          id: workspaceId,
          fileName: 'new-file.txt'
        } 
      });
      
      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('new-file.txt');
      expect(body.data.content).toBe('New file content');
      expect(body.data.active).toBe(true);
      
      // Verify file was created
      const file = await filesHandler.getFile('new-file.txt');
      expect(file.name).toBe('new-file.txt');
    });
    
    it('POST should return 409 when creating a file that already exists', async () => {
      // First create a file
      const createReq = createMockRequest('POST', { content: 'Existing content' });
      await filesHandler.createFile('existing-file.txt', createReq);
      
      const routes = createFilesRoutes();
      const fileData = {
        content: 'New content for existing file'
      };
      
      const req = createMockRequest('POST', fileData);
      
      const response = await routes.POST(req, { 
        params: { 
          id: workspaceId,
          fileName: 'existing-file.txt'
        } 
      });
      
      expect(response.status).toBe(409); // Conflict
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
    
    it('PUT should update a file', async () => {
      // First create a file
      const createReq = createMockRequest('POST', { content: 'Original content' });
      await filesHandler.createFile('update-file.txt', createReq);
      
      const routes = createFilesRoutes();
      const updateData = {
        content: 'Updated content'
      };
      
      const req = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(req, { 
        params: { 
          id: workspaceId,
          fileName: 'update-file.txt'
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.name).toBe('update-file.txt');
      expect(body.data.content).toBe('Updated content');
      
      // Verify file was updated
      const file = await filesHandler.getFile('update-file.txt');
      expect(file.content).toBe('Updated content');
    });
    
    it('PUT should update a file active status', async () => {
      // First create a file
      const createReq = createMockRequest('POST', { content: 'Content' });
      await filesHandler.createFile('active-status.txt', createReq);
      
      const routes = createFilesRoutes();
      const updateData = {
        active: false
      };
      
      const req = createMockRequest('PUT', updateData, 'http://localhost/api/workspaces/test-workspace/files/active-status.txt/active');
      
      const response = await routes.PUT(req, { 
        params: { 
          id: workspaceId,
          fileName: 'active-status.txt'
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.active).toBe(false);
      
      // Verify file status was updated
      const file = await filesHandler.getFile('active-status.txt');
      expect(file.active).toBe(false);
    });
    
    it('PUT should return 404 for nonexistent file', async () => {
      const routes = createFilesRoutes();
      const updateData = {
        content: 'Updated content'
      };
      
      const req = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(req, { 
        params: { 
          id: workspaceId,
          fileName: 'nonexistent.txt'
        } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
    
    it('DELETE should remove a file', async () => {
      // First create a file
      const createReq = createMockRequest('POST', { content: 'Content to delete' });
      await filesHandler.createFile('delete-file.txt', createReq);
      
      const routes = createFilesRoutes();
      const req = createMockRequest('DELETE');
      
      const response = await routes.DELETE(req, { 
        params: { 
          id: workspaceId,
          fileName: 'delete-file.txt'
        } 
      });
      
      expect(response.status).toBe(204); // No Content
      
      // Verify file was deleted
      await expect(filesHandler.getFile('delete-file.txt')).rejects.toThrow();
    });
    
    it('DELETE should return 404 for nonexistent file', async () => {
      const routes = createFilesRoutes();
      const req = createMockRequest('DELETE');
      
      const response = await routes.DELETE(req, { 
        params: { 
          id: workspaceId,
          fileName: 'nonexistent.txt'
        } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
    
    it('should return error if no workspace ID is provided', async () => {
      const routes = createFilesRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { params: {} });
      
      expect(response.status).toBe(500); // Internal server error or bad request
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });
});
