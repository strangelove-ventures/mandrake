import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { 
  createToolsConfigRoutes, 
  createServerConfigRoutes,
  createActiveConfigSetRoutes 
} from '@/lib/api/factories/tools';
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

describe('Tools Config Routes E2E', () => {
  let testDir: TestDirectory;
  let originalMandrakeRoot: string | undefined;
  let testWorkspace: WorkspaceManager;
  let workspaceToolsRoutes: ReturnType<typeof createToolsConfigRoutes>;
  let workspaceServerRoutes: ReturnType<typeof createServerConfigRoutes>;
  let workspaceActiveRoutes: ReturnType<typeof createActiveConfigSetRoutes>;
  let systemToolsRoutes: ReturnType<typeof createToolsConfigRoutes>;
  let systemServerRoutes: ReturnType<typeof createServerConfigRoutes>;
  let systemActiveRoutes: ReturnType<typeof createActiveConfigSetRoutes>;
  
  // Test data
  const testSetId = `test-set-${randomUUID().slice(0, 8)}`;
  const testServerId = `test-server-${randomUUID().slice(0, 8)}`;
  
  // Set up the test environment once
  beforeAll(async () => {
    const setup = await setupApiTest();
    testDir = setup.testDir;
    originalMandrakeRoot = setup.originalMandrakeRoot;
    
    // Create a test workspace
    testWorkspace = await createTestWorkspace();
    console.log(`Created test workspace: ${testWorkspace.name} (${testWorkspace.id})`);
    
    // Create route handlers
    workspaceToolsRoutes = createToolsConfigRoutes(true);
    workspaceServerRoutes = createServerConfigRoutes(true);
    workspaceActiveRoutes = createActiveConfigSetRoutes(true);
    systemToolsRoutes = createToolsConfigRoutes(false);
    systemServerRoutes = createServerConfigRoutes(false);
    systemActiveRoutes = createActiveConfigSetRoutes(false);
  });
  
  // Clean up the test environment
  afterAll(async () => {
    // Attempt to clean up test config sets
    try {
      await testWorkspace.tools.removeConfigSet(testSetId);
    } catch (error) {
      // Ignore errors during cleanup
      console.log(`Note: Could not clean up test config set: ${error}`);
    }
    
    await cleanupApiTest(testDir, originalMandrakeRoot);
  });
  
  describe('Config Set Management', () => {
    test('should create a new config set', async () => {
      // Create test data
      const configSetData = {
        id: testSetId,
        config: {}
      };
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools`,
        {
          method: 'POST',
          body: configSetData
        }
      );
      
      // Call the route handler
      const response = await workspaceToolsRoutes.POST(req, { 
        params: { id: testWorkspace.id } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(testSetId);
      
      // Verify the config set was actually created
      const configSets = await testWorkspace.tools.listConfigSets();
      expect(configSets).toContain(testSetId);
    });
    
    test('should list all config sets', async () => {
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools`
      );
      
      // Call the route handler
      const response = await workspaceToolsRoutes.GET(req, { 
        params: { id: testWorkspace.id } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      
      // Check that we receive an array of config set IDs
      expect(Array.isArray(result.data)).toBeTrue();
      expect(result.data).toContain(testSetId);
      expect(result.data).toContain('default'); // Default config set should exist
    });
    
    test('should get a specific config set', async () => {
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools/${testSetId}`
      );
      
      // Call the route handler
      const response = await workspaceToolsRoutes.GET(req, { 
        params: { id: testWorkspace.id, setId: testSetId } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('object');
      // The config set should be empty since we created it without any servers
      expect(Object.keys(result.data).length).toBe(0);
    });
  });
  
  describe('Server Config Management', () => {
    test('should add a server to a config set', async () => {
      // Create test data
      const serverData = {
        id: testServerId,
        config: {
          command: 'test-command',
          args: ['--test'],
          env: { TEST: 'true' }
        }
      };
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools/${testSetId}`,
        {
          method: 'POST',
          body: serverData
        }
      );
      
      // Call the route handler
      const response = await workspaceServerRoutes.POST(req, { 
        params: { id: testWorkspace.id, setId: testSetId } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(testServerId);
      expect(result.data.config).toBeDefined();
      expect(result.data.config.command).toBe('test-command');
      
      // Verify the server was actually added
      const configSet = await testWorkspace.tools.getConfigSet(testSetId);
      expect(configSet[testServerId]).toBeDefined();
      expect(configSet[testServerId].command).toBe('test-command');
    });
    
    test('should get a server config', async () => {
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools/${testSetId}/${testServerId}`
      );
      
      // Call the route handler
      const response = await workspaceServerRoutes.GET(req, { 
        params: { id: testWorkspace.id, setId: testSetId, serverId: testServerId } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.command).toBe('test-command');
      expect(result.data.args).toEqual(['--test']);
      expect(result.data.env).toEqual({ TEST: 'true' });
    });
    
    test('should update a server config', async () => {
      // Create update data
      const updateData = {
        command: 'updated-command',
        env: { TEST: 'updated' }
      };
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools/${testSetId}/${testServerId}`,
        {
          method: 'PUT',
          body: updateData
        }
      );
      
      // Call the route handler
      const response = await workspaceServerRoutes.PUT(req, { 
        params: { id: testWorkspace.id, setId: testSetId, serverId: testServerId } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.command).toBe('updated-command');
      expect(result.data.args).toEqual(['--test']); // Unchanged
      expect(result.data.env).toEqual({ TEST: 'updated' });
      
      // Verify the server was actually updated
      const configSet = await testWorkspace.tools.getConfigSet(testSetId);
      expect(configSet[testServerId].command).toBe('updated-command');
      expect((configSet[testServerId].env as any).TEST).toBe('updated');
    });
  });
  
  describe('Active Config Set Management', () => {
    test('should get the active config set', async () => {
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools/active`
      );
      
      // Call the route handler
      const response = await workspaceActiveRoutes.GET(req, { 
        params: { id: testWorkspace.id } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.active).toBe('default'); // Default should be active initially
      expect(result.data.config).toBeDefined();
    });
    
    test('should set the active config set', async () => {
      // Create set active data
      const activeData = {
        id: testSetId
      };
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools/active`,
        {
          method: 'PUT',
          body: activeData
        }
      );
      
      // Call the route handler
      const response = await workspaceActiveRoutes.PUT(req, { 
        params: { id: testWorkspace.id } 
      });
      
      // Parse the response
      const result = await parseApiResponse(response);
      
      // Verify the response
      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data.active).toBe(testSetId);
      
      // Verify active was actually updated
      const active = await testWorkspace.tools.getActive();
      expect(active).toBe(testSetId);
    });
  });
  
  describe('Error Cases', () => {
    test('should return 400 when workspace ID is missing', async () => {
      // Create a request
      const req = createTestRequest('https://example.com/api/workspaces/tools');
      
      try {
        // Call the route handler - expecting an error to be thrown
        await workspaceToolsRoutes.GET(req, { params: {} });
        // If we get here, the test should fail
        expect(false).toBe(true); // This should not execute
      } catch (error) {
        // Verify the caught error has the expected properties
        expect(error).toBeDefined();
        expect((error as any).status).toBe(400);
        expect((error as any).code).toBe('BAD_REQUEST');
        expect((error as any).message).toContain('Workspace ID is required');
      }
    });
    
    test('should return 404 for non-existent config set', async () => {
      const nonExistentId = `config-set-${randomUUID()}`;
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools/${nonExistentId}`
      );
      
      try {
        // Call the route handler - expecting an error to be thrown
        await workspaceToolsRoutes.GET(req, { 
          params: { id: testWorkspace.id, setId: nonExistentId } 
        });
        // If we get here, the test should fail
        expect(false).toBe(true); // This should not execute
      } catch (error) {
        // Verify the caught error has the expected properties
        expect(error).toBeDefined();
        expect((error as any).status).toBe(404);
        expect((error as any).code).toBe('RESOURCE_NOT_FOUND');
        expect((error as any).message).toContain('Config set not found');
      }
    });
    
    test('should return 404 for non-existent server', async () => {
      const nonExistentId = `server-${randomUUID()}`;
      
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools/${testSetId}/${nonExistentId}`
      );
      
      try {
        // Call the route handler - expecting an error to be thrown
        await workspaceServerRoutes.GET(req, { 
          params: { id: testWorkspace.id, setId: testSetId, serverId: nonExistentId } 
        });
        // If we get here, the test should fail
        expect(false).toBe(true); // This should not execute
      } catch (error) {
        // Verify the caught error has the expected properties
        expect(error).toBeDefined();
        expect((error as any).status).toBe(404);
        expect((error as any).code).toBe('RESOURCE_NOT_FOUND');
        expect((error as any).message).toContain('Server not found');
      }
    });
    
    test('should delete a server and return 204', async () => {
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools/${testSetId}/${testServerId}`,
        { method: 'DELETE' }
      );
      
      // Call the route handler
      const response = await workspaceServerRoutes.DELETE(req, { 
        params: { id: testWorkspace.id, setId: testSetId, serverId: testServerId } 
      });
      
      // Verify the response is 204 No Content
      expect(response.status).toBe(204);
      
      // Verify the server was actually deleted
      const configSet = await testWorkspace.tools.getConfigSet(testSetId);
      expect(configSet[testServerId]).toBeUndefined();
    });
    
    test('should delete a config set and return 204', async () => {
      // Create a request
      const req = createTestRequest(
        `https://example.com/api/workspaces/${testWorkspace.id}/tools/${testSetId}`,
        { method: 'DELETE' }
      );
      
      // Call the route handler
      const response = await workspaceToolsRoutes.DELETE(req, { 
        params: { id: testWorkspace.id, setId: testSetId } 
      });
      
      // Verify the response is 204 No Content
      expect(response.status).toBe(204);
      
      // Verify the config set was actually deleted
      const configSets = await testWorkspace.tools.listConfigSets();
      expect(configSets).not.toContain(testSetId);
    });
  });
});
