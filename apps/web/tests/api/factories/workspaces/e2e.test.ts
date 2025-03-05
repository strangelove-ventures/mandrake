import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createWorkspacesRoutes, createWorkspaceAdoptRoutes } from '@/server/api/factories/workspaces';
import { 
  setupApiTest, 
  cleanupApiTest, 
  createTestRequest,
  parseApiResponse 
} from '../../utils/setup';
import { TestDirectory } from '../../../utils/test-dir';
import { randomUUID } from 'crypto';
import { MandrakeManager } from '@mandrake/workspace';
import { getMandrakeManagerForRequest } from '@/server/services/helpers';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

describe('Workspace Routes E2E', () => {
  let testDir: TestDirectory;
  let originalMandrakeRoot: string | undefined;
  let mandrakeManager: MandrakeManager;
  let workspaceRoutes: ReturnType<typeof createWorkspacesRoutes>;
  let adoptRoutes: ReturnType<typeof createWorkspaceAdoptRoutes>;
  
  // Test data
  const testWorkspaceName = `test-ws-${randomUUID().slice(0, 8)}`;
  let testWorkspaceId: string;
  
  // Set up the test environment once
  beforeAll(async () => {
    const setup = await setupApiTest();
    testDir = setup.testDir;
    originalMandrakeRoot = setup.originalMandrakeRoot;
    
    // Get mandrake manager
    mandrakeManager = await getMandrakeManagerForRequest();
    
    // Create route handlers
    workspaceRoutes = createWorkspacesRoutes();
    adoptRoutes = createWorkspaceAdoptRoutes();
    
    // Create a test workspace
    const workspace = await mandrakeManager.createWorkspace(testWorkspaceName);
    testWorkspaceId = workspace.id;
    console.log(`Created test workspace: ${testWorkspaceName} (${testWorkspaceId})`);
  });
  
  // Clean up the test environment
  afterAll(async () => {
    // Clean up test workspace
    try {
      await mandrakeManager.deleteWorkspace(testWorkspaceId);
    } catch (error) {
      console.log(`Note: Could not delete test workspace: ${error}`);
    }
    
    await cleanupApiTest(testDir, originalMandrakeRoot);
  });
  
  describe('List and Get Operations', () => {
    test('should list all workspaces', async () => {
      // Create a request
      const req = createTestRequest('https://example.com/api/workspaces');
      
      try {
        // Call the route handler
        const response = await workspaceRoutes.GET(req);
        
        // Parse the response
        const result = await parseApiResponse(response);
        
        // Verify the response
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        expect(Array.isArray(result.data)).toBe(true);
        
        // Our test workspace should be in the list
        const foundWorkspace = result.data.find((ws: any) => ws.id === testWorkspaceId);
        expect(foundWorkspace).toBeDefined();
        expect(foundWorkspace.name).toBe(testWorkspaceName);
      } catch (error) {
        console.error('Error in list workspaces test:', error);
        throw error;
      }
    });
    
    test('should get details of a specific workspace', async () => {
      // Create a request
      const req = createTestRequest(`https://example.com/api/workspaces/${testWorkspaceId}`);
      
      try {
        // Call the route handler
        const response = await workspaceRoutes.GET(req, { params: { id: testWorkspaceId } });
        
        // Parse the response
        const result = await parseApiResponse(response);
        
        // Verify the response
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        expect(result.data).toBeDefined();
        expect(result.data.id).toBe(testWorkspaceId);
        expect(result.data.name).toBe(testWorkspaceName);
      } catch (error) {
        console.error('Error in get workspace test:', error);
        throw error;
      }
    });
    
    test('should return 404 for non-existent workspace', async () => {
      const nonExistentId = randomUUID();
      
      // Create a request
      const req = createTestRequest(`https://example.com/api/workspaces/${nonExistentId}`);
      
      try {
        // Call the route handler - expecting an error to be thrown
        await workspaceRoutes.GET(req, { params: { id: nonExistentId } });
        // If we get here, the test should fail
        expect(false).toBe(true); // This should not execute
      } catch (error) {
        // Verify the caught error has the expected properties
        expect(error).toBeDefined();
        expect((error as any).status).toBe(404);
        expect((error as any).code).toBe('RESOURCE_NOT_FOUND');
        expect((error as any).message).toContain('Workspace not found');
      }
    });
  });
  
  describe('Create and Update Operations', () => {
    let createdWorkspaceId: string;
    
    test('should create a new workspace', async () => {
      const newWorkspaceName = `test-ws-create-${randomUUID().slice(0, 8)}`;
      
      // Create a request
      const req = createTestRequest(
        'https://example.com/api/workspaces',
        {
          method: 'POST',
          body: {
            name: newWorkspaceName,
            description: 'Test workspace created during E2E tests'
          }
        }
      );
      
      try {
        // Call the route handler
        const response = await workspaceRoutes.POST(req);
        
        // Parse the response
        const result = await parseApiResponse(response);
        
        // Verify the response
        expect(result.success).toBe(true);
        expect(result.status).toBe(201);
        expect(result.data).toBeDefined();
        expect(result.data.name).toBe(newWorkspaceName);
        expect(result.data.description).toBe('Test workspace created during E2E tests');
        
        // Save ID for later tests
        createdWorkspaceId = result.data.id;
        
        // Verify the workspace was actually created
        const workspaces = await mandrakeManager.listWorkspaces();
        const foundWorkspace = workspaces.find(ws => ws.id === createdWorkspaceId);
        expect(foundWorkspace).toBeDefined();
        expect(foundWorkspace?.name).toBe(newWorkspaceName);
      } catch (error) {
        console.error('Error in create workspace test:', error);
        throw error;
      }
    });
    
    test('should return 409 when creating workspace with existing name', async () => {
      // Attempt to create a workspace with the same name
      const req = createTestRequest(
        'https://example.com/api/workspaces',
        {
          method: 'POST',
          body: {
            name: testWorkspaceName, // Using the name of our test workspace that already exists
            description: 'This should fail'
          }
        }
      );
      
      try {
        // Call the route handler - expecting an error to be thrown
        await workspaceRoutes.POST(req);
        // If we get here, the test should fail
        expect(false).toBe(true); // This should not execute
      } catch (error) {
        // Verify the caught error has the expected properties
        expect(error).toBeDefined();
        expect((error as any).status).toBe(409);
        expect((error as any).code).toBe('RESOURCE_CONFLICT');
        expect((error as any).message).toContain('already exists');
      }
    });
    
    test('should update a workspace description', async () => {
      // Skip if no created workspace
      if (!createdWorkspaceId) {
        console.log('Skipping update test - no workspace was created');
        return;
      }
      
      const updatedDescription = 'This description was updated via API';
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${createdWorkspaceId}`,
        {
          method: 'PUT',
          body: {
            description: updatedDescription
          }
        }
      );
      
      try {
        // Call the route handler
        const response = await workspaceRoutes.PUT(req, { params: { id: createdWorkspaceId } });
        
        // Parse the response
        const result = await parseApiResponse(response);
        
        // Verify the response
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        expect(result.data).toBeDefined();
        expect(result.data.description).toBe(updatedDescription);
        
        // Verify the workspace was actually updated
        const workspaceInfo = await mandrakeManager.config.findWorkspaceById(createdWorkspaceId);
        expect(workspaceInfo).toBeDefined();
        expect(workspaceInfo?.description).toBe(updatedDescription);
      } catch (error) {
        console.error('Error in update workspace test:', error);
        throw error;
      }
    });
  });
  
  describe('Delete Operations', () => {
    let workspaceToDeleteId: string;
    
    // Create a workspace specifically for deletion
    beforeAll(async () => {
      const workspaceToDelete = await mandrakeManager.createWorkspace(`ws-to-delete-${randomUUID().slice(0, 8)}`);
      workspaceToDeleteId = workspaceToDelete.id;
    });
    
    test('should delete a workspace', async () => {
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${workspaceToDeleteId}`,
        {
          method: 'DELETE'
        }
      );
      
      try {
        // Call the route handler
        const response = await workspaceRoutes.DELETE(req, { params: { id: workspaceToDeleteId } });
        
        // Verify the response is 204 No Content
        expect(response.status).toBe(204);
        
        // Verify the workspace was actually deleted
        const workspaceInfo = await mandrakeManager.config.findWorkspaceById(workspaceToDeleteId);
        expect(workspaceInfo).toBeNull();
      } catch (error) {
        console.error('Error in delete workspace test:', error);
        throw error;
      }
    });
    
    test('should return 404 when deleting non-existent workspace', async () => {
      const nonExistentId = randomUUID();
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${nonExistentId}`,
        {
          method: 'DELETE'
        }
      );
      
      try {
        // Call the route handler - expecting an error to be thrown
        await workspaceRoutes.DELETE(req, { params: { id: nonExistentId } });
        // If we get here, the test should fail
        expect(false).toBe(true); // This should not execute
      } catch (error) {
        // Verify the caught error has the expected properties
        expect(error).toBeDefined();
        expect((error as any).status).toBe(404);
        expect((error as any).code).toBe('RESOURCE_NOT_FOUND');
        expect((error as any).message).toContain('Workspace not found');
      }
    });
  });
  
  describe('Adopt Operations', () => {
    let adoptedWorkspacePath: string;
    let adoptedWorkspaceId: string;
    let adoptedWorkspaceName: string;
    
    // Create a workspace directory structure to adopt
    beforeAll(async () => {
      // Create a directory structure that can be adopted
      adoptedWorkspaceName = `ws-to-adopt-${randomUUID().slice(0, 8)}`;
      adoptedWorkspacePath = join(testDir.path, adoptedWorkspaceName);
      
      // Create basic directory structure
      await mkdir(join(adoptedWorkspacePath, '.ws', 'config'), { recursive: true });
      
      // Create a fake workspace config
      const workspaceConfig = {
        id: randomUUID(),
        name: adoptedWorkspaceName,
        created: new Date().toISOString(),
        metadata: {}
      };
      
      // Write the config to a file
      await writeFile(
        join(adoptedWorkspacePath, '.ws', 'config', 'workspace.json'),
        JSON.stringify(workspaceConfig, null, 2)
      );
      
      // Save ID for later verification
      adoptedWorkspaceId = workspaceConfig.id;
    });
    
    test('should adopt an existing workspace', async () => {
      // Use the same name to avoid path issues during adoption
      
      // Create a request
      const req = createTestRequest(
        'https://example.com/api/workspaces/adopt',
        {
          method: 'POST',
          body: {
            name: adoptedWorkspaceName, // Use the existing name
            path: adoptedWorkspacePath,
            description: 'This workspace was adopted via API'
          }
        }
      );
      
      try {
        // Call the route handler
        const response = await adoptRoutes.POST(req);
        
        // Parse the response
        const result = await parseApiResponse(response);
        
        // Verify the response
        expect(result.success).toBe(true);
        expect(result.status).toBe(201);
        expect(result.data).toBeDefined();
        expect(result.data.name).toBe(adoptedWorkspaceName);
        expect(result.data.path).toBe(adoptedWorkspacePath);
        expect(result.data.description).toBe('This workspace was adopted via API');
        
        // The adopted workspace should have the same ID as our original workspace config
        expect(result.data.id).toBe(adoptedWorkspaceId);
        
        // Verify the workspace was actually adopted
        const workspaceInfo = await mandrakeManager.config.findWorkspaceById(adoptedWorkspaceId);
        expect(workspaceInfo).toBeDefined();
        expect(workspaceInfo?.name).toBe(adoptedWorkspaceName);
        
        // Clean up the adopted workspace after the test
        await mandrakeManager.deleteWorkspace(adoptedWorkspaceId);
      } catch (error) {
        console.error('Error in adopt workspace test:', error);
        throw error;
      }
    });
    
    test('should return 400 when adopting invalid workspace', async () => {
      const invalidPath = join(testDir.path, 'non-existent-dir');
      
      // Create a request
      const req = createTestRequest(
        'https://example.com/api/workspaces/adopt',
        {
          method: 'POST',
          body: {
            name: 'invalid-adoption',
            path: invalidPath
          }
        }
      );
      
      try {
        // Call the route handler - expecting an error to be thrown
        await adoptRoutes.POST(req);
        // If we get here, the test should fail
        expect(false).toBe(true); // This should not execute
      } catch (error) {
        // Verify the caught error has the expected properties
        expect(error).toBeDefined();
        expect((error as any).status).toBe(400);
        expect((error as any).code).toBe('BAD_REQUEST');
        expect((error as any).message).toContain('Cannot adopt');
      }
    });
  });
});
