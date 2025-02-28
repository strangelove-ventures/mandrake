import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createFilesRoutes, createFileActiveRoutes } from '@/lib/api/factories/files';
import { 
  setupApiTest, 
  cleanupApiTest, 
  createTestWorkspace, 
  createTestRequest,
  parseApiResponse 
} from '../../utils/setup';
import { TestDirectory } from '../../../utils/test-dir';
import { WorkspaceManager } from '@mandrake/workspace';
import { randomUUID } from 'crypto';

describe('Files Routes E2E', () => {
  let testDir: TestDirectory;
  let originalMandrakeRoot: string | undefined;
  let testWorkspace: WorkspaceManager;
  let filesRoutes: ReturnType<typeof createFilesRoutes>;
  let fileActiveRoutes: ReturnType<typeof createFileActiveRoutes>;
  
  // Test file name for reuse in tests
  let testFileName: string;
  
  // Set up the test environment once
  beforeAll(async () => {
    const setup = await setupApiTest();
    testDir = setup.testDir;
    originalMandrakeRoot = setup.originalMandrakeRoot;
    
    // Create a test workspace
    testWorkspace = await createTestWorkspace();
    console.log(`Created test workspace: ${testWorkspace.name} (${testWorkspace.id})`);
    
    // Create route handlers
    filesRoutes = createFilesRoutes(true); // Workspace-scoped
    fileActiveRoutes = createFileActiveRoutes(true);
    
    // Create a test file to use in tests
    try {
      testFileName = `test-file-${randomUUID().slice(0, 8)}.txt`;
      const fileContent = 'This is a test file for the files API';
      
      // Create a file directly using the files manager
      await testWorkspace.files.create(testFileName, fileContent, true);
      console.log(`Created test file: ${testFileName}`);
    } catch (error) {
      console.error('Failed to create test file:', error);
      // Don't fail the setup - tests will handle the missing file gracefully
    }
  });
  
  // Clean up the test environment
  afterAll(async () => {
    // Attempt to clean up the test file
    try {
      if (testFileName) {
        await testWorkspace.files.delete(testFileName);
      }
    } catch (error) {
      // Ignore errors during cleanup
      console.log(`Note: Could not clean up test file: ${error}`);
    }
    
    await cleanupApiTest(testDir, originalMandrakeRoot);
  });
  
  describe('Error cases', () => {
    test('should return 400 when workspace ID is missing', async () => {
      try {
        // Create a request
        const req = createTestRequest('https://example.com/api/workspaces/files');
        
        // Call the route handler
        const response = await filesRoutes.GET(req, { params: {} });
        
        // Parse the response
        const result = await parseApiResponse(response);
        
        // Verify the response
        expect(result.success).toBe(false);
        expect(result.status).toBe(400);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('BAD_REQUEST');
        expect(result.error?.message).toContain('Workspace ID is required');
      } catch (error) {
        // Test the error properties directly
        expect(error).toBeDefined();
        expect((error as any).status).toBe(400);
        expect((error as any).code).toBe('BAD_REQUEST');
        expect((error as any).message).toContain('Workspace ID is required');
      }
    });
    
    test('should return 400 with invalid POST body', async () => {
      try {
        // Create invalid test data (missing required fields)
        const fileData = {
          // Missing name, which is required
          content: 'Test content'
        };
        
        // Create a request
        const req = createTestRequest(
          `https://example.com/api/workspaces/${testWorkspace.id}/files`,
          {
            method: 'POST',
            body: fileData
          }
        );
        
        // Call the route handler with the actual workspace ID
        const response = await filesRoutes.POST(req, { 
          params: { id: testWorkspace.id } 
        });
        
        // Parse the response
        const result = await parseApiResponse(response);
        
        // Verify the response
        expect(result.success).toBe(false);
        expect(result.status).toBe(400);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('BAD_REQUEST');
      } catch (error) {
        // Test the error properties directly
        expect(error).toBeDefined();
        expect((error as any).message).toContain('Invalid request data');
      }
    });
    
    test('should return 404 for non-existent file', async () => {
      try {
        const nonExistentName = `nonexistent-${randomUUID()}.txt`;
        
        // Create a request
        const req = createTestRequest(
          `https://example.com/api/workspaces/${testWorkspace.id}/files/${nonExistentName}`
        );
        
        // Call the route handler
        const response = await filesRoutes.GET(req, { 
          params: { id: testWorkspace.id, fileName: nonExistentName } 
        });
        
        // Parse the response
        const result = await parseApiResponse(response);
        
        // Verify the response
        expect(result.success).toBe(false);
        expect(result.status).toBe(404);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
        expect(result.error?.message).toContain('File not found');
      } catch (error) {
        // Test the error properties directly
        expect(error).toBeDefined();
        expect((error as any).status).toBe(404);
        expect((error as any).code).toBe('RESOURCE_NOT_FOUND');
        expect((error as any).message).toContain('File not found');
      }
    });
    
    test('should return 501 for system-level file operations', async () => {
      try {
        // Create a request for a system-level file operation
        // Note: We're still using the workspace routes but setting workspaceScoped=false in the route handler
        const systemFilesRoutes = createFilesRoutes(false);
        const req = createTestRequest('https://example.com/api/files');
        
        // Call the route handler
        const response = await systemFilesRoutes.GET(req, { params: {} });
        
        // Parse the response
        const result = await parseApiResponse(response);
        
        // Verify the response
        expect(result.success).toBe(false);
        expect(result.status).toBe(501);
        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('NOT_IMPLEMENTED');
        expect(result.error?.message).toContain('System-level files are not supported');
      } catch (error) {
        // Test the error properties directly
        expect(error).toBeDefined();
        expect((error as any).status).toBe(501);
        expect((error as any).code).toBe('NOT_IMPLEMENTED');
        expect((error as any).message).toContain('System-level files are not supported');
      }
    });
  });
  
  describe('Workspace-level CRUD operations', () => {
    test('should list all files in workspace', async () => {
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/files`
      );
      
      // Call the route handler
      const response = await filesRoutes.GET(req, { 
        params: { id: testWorkspace.id } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(Array.isArray(result.data)).toBe(true);
      
      // Skip the file check if we don't have a valid testFileName
      if (testFileName) {
        // Verify the file we created is in the list
        const foundFile = result.data.find((file: any) => file.name === testFileName);
        expect(foundFile).toBeDefined();
        expect(foundFile.content).toBe('This is a test file for the files API');
        expect(foundFile.active).toBe(true);
      }
    });
    
    test('should get a specific file', async () => {
      // Skip this test if we don't have a valid testFileName
      if (!testFileName) {
        console.log('Skipping get file test - no test file available');
        return;
      }
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/files/${testFileName}`
      );
      
      // Call the route handler
      const response = await filesRoutes.GET(req, { 
        params: { id: testWorkspace.id, fileName: testFileName } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe(testFileName);
      expect(result.data.content).toBe('This is a test file for the files API');
      expect(result.data.active).toBe(true);
    });
    
    test('should create a new file', async () => {
      // Create test data with all required fields
      const newFileName = `new-file-${randomUUID().slice(0, 8)}.txt`;
      const fileData = {
        name: newFileName,
        content: 'This is a newly created file',
        active: true
      };
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/files`,
        {
          method: 'POST',
          body: fileData
        }
      );
      
      // Call the route handler
      const response = await filesRoutes.POST(req, { 
        params: { id: testWorkspace.id } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe(newFileName);
      expect(result.data.content).toBe('This is a newly created file');
      expect(result.data.active).toBe(true);
      
      // Verify the file was created by getting it directly
      const createdFile = await testWorkspace.files.get(newFileName);
      expect(createdFile).toBeDefined();
      expect(createdFile.name).toBe(newFileName);
      expect(createdFile.content).toBe('This is a newly created file');
      
      // Clean up the created file
      try {
        await testWorkspace.files.delete(newFileName);
      } catch (error) {
        console.log(`Note: Could not clean up created file: ${error}`);
      }
    });
    
    test('should update a file', async () => {
      // Skip this test if we don't have a valid testFileName
      if (!testFileName) {
        console.log('Skipping update test - no test file available');
        return;
      }

      // Create update data
      const updateData = {
        content: 'This is updated content for the test file'
      };
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/files/${testFileName}`,
        {
          method: 'PUT',
          body: updateData
        }
      );
      
      // Call the route handler
      const response = await filesRoutes.PUT(req, { 
        params: { id: testWorkspace.id, fileName: testFileName } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe(testFileName);
      expect(result.data.content).toBe('This is updated content for the test file');
      
      // Verify the file was updated by getting it directly
      const updatedFile = await testWorkspace.files.get(testFileName);
      expect(updatedFile).toBeDefined();
      expect(updatedFile.content).toBe('This is updated content for the test file');
    });
    
    test('should delete a file', async () => {
      try {
        // First create a file to delete
        const deleteFileName = `delete-file-${randomUUID().slice(0, 8)}.txt`;
        await testWorkspace.files.create(deleteFileName, 'This file will be deleted', true);
        
        // Create a request
        const req = createTestRequest(
          `https://example.com/api/workspaces/${testWorkspace.id}/files/${deleteFileName}`,
          { method: 'DELETE' }
        );
        
        // Call the route handler
        const response = await filesRoutes.DELETE(req, { 
          params: { id: testWorkspace.id, fileName: deleteFileName } 
        });
        
        // Verify the response is 204 No Content
        expect(response.status).toBe(204);
        
        // Verify the file was actually deleted by trying to get it
        try {
          await testWorkspace.files.get(deleteFileName);
          // Should fail - if we get here, that's a problem
          expect(false).toBe(true); // Force a test failure
        } catch (error) {
          // This is the expected path - file should be gone
          expect((error as Error).message).toContain('not found');
        }
      } catch (error) {
        console.error('Error in delete test:', error);
        throw error;
      }
    });
    
    test('should set a file active state', async () => {
      // Skip this test if we don't have a valid testFileName
      if (!testFileName) {
        console.log('Skipping active state test - no test file available');
        return;
      }
      
      try {
        // First set the file to inactive
        const setInactiveReq = createTestRequest(
          `https://example.com/api/workspaces/${testWorkspace.id}/files/${testFileName}/active`,
          {
            method: 'PUT',
            body: { active: false }
          }
        );
        
        // Call the route handler
        const inactiveResponse = await fileActiveRoutes.PUT(setInactiveReq, { 
          params: { id: testWorkspace.id, fileName: testFileName } 
        });
        
        // Parse the response
        const inactiveResult = await parseApiResponse(inactiveResponse);
        
        // Verify the response
        expect(inactiveResult.success).toBe(true);
        expect(inactiveResult.status).toBe(200);
        expect(inactiveResult.data).toBeDefined();
        expect(inactiveResult.data.name).toBe(testFileName);
        expect(inactiveResult.data.active).toBe(false);
        
        // Verify the file state was updated by getting it directly
        const inactiveFile = await testWorkspace.files.get(testFileName);
        expect(inactiveFile).toBeDefined();
        expect(inactiveFile.active).toBe(false);
        
        // Now set it back to active
        const setActiveReq = createTestRequest(
          `https://example.com/api/workspaces/${testWorkspace.id}/files/${testFileName}/active`,
          {
            method: 'PUT',
            body: { active: true }
          }
        );
        
        // Call the route handler
        const activeResponse = await fileActiveRoutes.PUT(setActiveReq, { 
          params: { id: testWorkspace.id, fileName: testFileName } 
        });
        
        // Parse the response
        const activeResult = await parseApiResponse(activeResponse);
        
        // Verify the response
        expect(activeResult.success).toBe(true);
        expect(activeResult.status).toBe(200);
        expect(activeResult.data).toBeDefined();
        expect(activeResult.data.name).toBe(testFileName);
        expect(activeResult.data.active).toBe(true);
        
        // Verify the file state was updated by getting it directly
        const activeFile = await testWorkspace.files.get(testFileName);
        expect(activeFile).toBeDefined();
        expect(activeFile.active).toBe(true);
      } catch (error) {
        console.error('Error in active state test:', error);
        throw error;
      }
    });
    
    test('should list inactive files', async () => {
      try {
        // First create an inactive file
        const inactiveFileName = `inactive-file-${randomUUID().slice(0, 8)}.txt`;
        await testWorkspace.files.create(inactiveFileName, 'This is an inactive file', false);
        
        // Create a request specifically for inactive files
        const req = createTestRequest(
          `https://example.com/api/workspaces/${testWorkspace.id}/files?active=false`
        );
        
        // Call the route handler
        const response = await filesRoutes.GET(req, { 
          params: { id: testWorkspace.id } 
        });
        
        // Parse the response
        const result = await parseApiResponse(response);
        
        // Verify the response
        expect(result.success).toBe(true);
        expect(result.status).toBe(200);
        expect(Array.isArray(result.data)).toBe(true);
        
        // Find our inactive file in the list
        const foundFile = result.data.find((file: any) => file.name === inactiveFileName);
        expect(foundFile).toBeDefined();
        expect(foundFile.content).toBe('This is an inactive file');
        expect(foundFile.active).toBe(false);
        
        // Clean up the inactive file
        try {
          await testWorkspace.files.delete(inactiveFileName);
        } catch (error) {
          console.log(`Note: Could not clean up inactive file: ${error}`);
        }
      } catch (error) {
        console.error('Error in list inactive files test:', error);
        throw error;
      }
    });
  });
});
