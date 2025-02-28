import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createPromptRoutes } from '@/lib/api/factories/prompt';
import { 
  setupApiTest, 
  cleanupApiTest, 
  createTestWorkspace, 
  createTestRequest,
  parseApiResponse 
} from '../../utils/setup';
import { TestDirectory } from '../../../utils/test-dir';
import { WorkspaceManager } from '@mandrake/workspace';

describe('Prompt Routes E2E', () => {
  let testDir: TestDirectory;
  let originalMandrakeRoot: string | undefined;
  let testWorkspace: WorkspaceManager;
  let workspaceRoutes: ReturnType<typeof createPromptRoutes>;
  let systemRoutes: ReturnType<typeof createPromptRoutes>;
  
  // Set up the test environment once
  beforeAll(async () => {
    const setup = await setupApiTest();
    testDir = setup.testDir;
    originalMandrakeRoot = setup.originalMandrakeRoot;
    
    // Create a test workspace
    testWorkspace = await createTestWorkspace();
    console.log(`Created test workspace: ${testWorkspace.name} (${testWorkspace.id})`);
    
    // Create route handlers
    workspaceRoutes = createPromptRoutes(true); // Workspace-scoped
    systemRoutes = createPromptRoutes(false);   // System-level
  });
  
  // Clean up the test environment
  afterAll(async () => {
    await cleanupApiTest(testDir, originalMandrakeRoot);
  });
  
  describe('Error cases', () => {
    test('should return 400 when workspace ID is missing', async () => {
      try {
        // Create a request
        const req = createTestRequest('https://example.com/api/workspaces/prompt');
        
        // Call the route handler
        const response = await workspaceRoutes.GET(req, { params: {} });
        
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
    
    test('should return 400 with invalid PUT body', async () => {
      try {
        // Create invalid test data (missing required fields)
        const promptData = {
          // Missing instructions field
          includeWorkspaceMetadata: true,
          includeSystemInfo: true
          // Missing includeDateTime field
        };
        
        // Create a request
        const req = createTestRequest(
          `https://example.com/api/workspaces/${testWorkspace.id}/prompt`,
          {
            method: 'PUT',
            body: promptData
          }
        );
        
        // Call the route handler with the actual workspace ID
        const response = await workspaceRoutes.PUT(req, { 
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
  });
  
  describe('System-level operations', () => {
    test('should get system prompt configuration', async () => {
      // Create a request
      const req = createTestRequest('https://example.com/api/prompt');
      
      // Call the route handler
      const response = await systemRoutes.GET(req, { params: {} });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      
      // The prompt config should have expected fields
      expect(result.data.instructions).toBeDefined();
      expect(typeof result.data.instructions).toBe('string');
      expect(result.data.includeWorkspaceMetadata).toBeDefined();
      expect(typeof result.data.includeWorkspaceMetadata).toBe('boolean');
      expect(result.data.includeSystemInfo).toBeDefined();
      expect(typeof result.data.includeSystemInfo).toBe('boolean');
      expect(result.data.includeDateTime).toBeDefined();
      expect(typeof result.data.includeDateTime).toBe('boolean');
    });
    
    test('should update system prompt configuration', async () => {
      // First get the current config
      const getReq = createTestRequest('https://example.com/api/prompt');
      const getResponse = await systemRoutes.GET(getReq, { params: {} });
      const getResult = await parseApiResponse(getResponse);
      const originalConfig = getResult.data;
      
      // Create update data
      const updateData = {
        ...originalConfig,
        instructions: 'Updated system instructions for testing',
        includeWorkspaceMetadata: !originalConfig.includeWorkspaceMetadata
      };
      
      // Create a request
      const updateReq = createTestRequest(
        'https://example.com/api/prompt',
        {
          method: 'PUT',
          body: updateData
        }
      );
      
      // Call the route handler
      const updateResponse = await systemRoutes.PUT(updateReq, { params: {} });
      
      // Parse the response
      const updateResult = await parseApiResponse(updateResponse);
      
      // Verify the response
      expect(updateResult.success).toBe(true);
      expect(updateResult.status).toBe(200);
      expect(updateResult.data).toBeDefined();
      
      // Verify the config was updated
      expect(updateResult.data.instructions).toBe('Updated system instructions for testing');
      expect(updateResult.data.includeWorkspaceMetadata).toBe(!originalConfig.includeWorkspaceMetadata);
      
      // Reset to original config to not affect other tests
      const resetReq = createTestRequest(
        'https://example.com/api/prompt',
        {
          method: 'PUT',
          body: originalConfig
        }
      );
      
      await systemRoutes.PUT(resetReq, { params: {} });
    });
  });
  
  describe('Workspace-level operations', () => {
    test('should get workspace prompt configuration', async () => {
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/prompt`
      );
      
      // Call the route handler
      const response = await workspaceRoutes.GET(req, { 
        params: { id: testWorkspace.id } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      
      // The prompt config should have expected fields
      expect(result.data.instructions).toBeDefined();
      expect(typeof result.data.instructions).toBe('string');
      expect(result.data.includeWorkspaceMetadata).toBeDefined();
      expect(typeof result.data.includeWorkspaceMetadata).toBe('boolean');
      expect(result.data.includeSystemInfo).toBeDefined();
      expect(typeof result.data.includeSystemInfo).toBe('boolean');
      expect(result.data.includeDateTime).toBeDefined();
      expect(typeof result.data.includeDateTime).toBe('boolean');
    });
    
    test('should update workspace prompt configuration', async () => {
      // First get the current config
      const getReq = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/prompt`
      );
      
      const getResponse = await workspaceRoutes.GET(getReq, { 
        params: { id: testWorkspace.id } 
      });
      
      const getResult = await parseApiResponse(getResponse);
      const originalConfig = getResult.data;
      
      // Create update data
      const updateData = {
        ...originalConfig,
        instructions: 'Updated workspace instructions for testing',
        includeSystemInfo: !originalConfig.includeSystemInfo
      };
      
      // Create a request
      const updateReq = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/prompt`,
        {
          method: 'PUT',
          body: updateData
        }
      );
      
      // Call the route handler
      const updateResponse = await workspaceRoutes.PUT(updateReq, { 
        params: { id: testWorkspace.id } 
      });
      
      // Parse the response
      const updateResult = await parseApiResponse(updateResponse);
      
      // Verify the response
      expect(updateResult.success).toBe(true);
      expect(updateResult.status).toBe(200);
      expect(updateResult.data).toBeDefined();
      
      // Verify the config was updated
      expect(updateResult.data.instructions).toBe('Updated workspace instructions for testing');
      expect(updateResult.data.includeSystemInfo).toBe(!originalConfig.includeSystemInfo);
      
      // Reset to original config to not affect other tests
      const resetReq = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/prompt`,
        {
          method: 'PUT',
          body: originalConfig
        }
      );
      
      await workspaceRoutes.PUT(resetReq, { 
        params: { id: testWorkspace.id } 
      });
    });
  });
});
