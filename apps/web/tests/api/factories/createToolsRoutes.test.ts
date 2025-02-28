import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { 
  createTestRequest, 
  createTestMandrakeManager,
  createTestEnvironment,
  createParams,
  validateResponse,
  getResponseData,
  createTestWorkspace
} from './test-utils';
import { 
  createToolsRoutes, 
  createActiveToolsRoutes,
  createServerStatusRoutes,
  createServerMethodsRoutes,
  createMethodExecutionRoutes
} from '@/lib/api/factories/createToolsRoutes';
import { getMandrakeManager, getWorkspaceManagerById, getMCPManager } from '@/lib/api/utils/workspace';

// Mock the workspace utilities
vi.mock('@/lib/api/utils/workspace', async () => {
  return {
    getMandrakeManager: vi.fn(),
    getWorkspaceManagerById: vi.fn(),
    getMCPManager: vi.fn()
  };
});

describe('Tools Routes Factory', () => {
  let testEnv: any;
  
  beforeAll(async () => {
    // Create a test environment
    testEnv = await createTestEnvironment();
    
    // Mock the utility functions
    (getMandrakeManager as any).mockReturnValue(testEnv.mandrakeManager);
    (getWorkspaceManagerById as any).mockImplementation((id) => {
      if (id === testEnv.workspace.id) {
        return Promise.resolve(testEnv.workspace);
      }
      return Promise.reject(new Error(`Workspace not found: ${id}`));
    });
    (getMCPManager as any).mockReturnValue(testEnv.mcpManager);
  });
  
  afterAll(async () => {
    // Clean up test environment
    await testEnv.cleanup();
  });
  
  describe('createToolsRoutes (System Level)', () => {
    // Setup initial tool configs
    beforeEach(async () => {
      // Add a test tool set
      await testEnv.mandrakeManager.tools.addConfigSet('test-set', {});
      
      // Add a server to the test set
      await testEnv.mandrakeManager.tools.addServerConfig('test-set', 'test-server', {
        command: 'node',
        args: ['-e', 'console.log("Test server")'],
        disabled: true
      });
    });
    
    describe('GET', () => {
      it('should list all tool sets', async () => {
        // Create the route handler
        const { GET } = createToolsRoutes();
        
        // Create a test request
        const req = createTestRequest('GET', 'http://localhost/api/tools');
        
        // Execute the handler
        const response = await GET(req);
        
        // Validate the response
        validateResponse(response);
        const data = await getResponseData(response);
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.sets).toContain('test-set');
        expect(data.data.active).toBeDefined();
      });
      
      it('should get a specific tool set', async () => {
        // Create the route handler
        const { GET } = createToolsRoutes();
        
        // Create a test request
        const req = createTestRequest('GET', 'http://localhost/api/tools/test-set');
        
        // Execute the handler with params
        const response = await GET(req, createParams({ setId: 'test-set' }));
        
        // Validate the response
        validateResponse(response);
        const data = await getResponseData(response);
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.id).toBe('test-set');
        expect(data.data.servers).toBeInstanceOf(Array);
        expect(data.data.servers.length).toBeGreaterThan(0);
        expect(data.data.servers[0].id).toBe('test-server');
      });
      
      it('should get a specific server in a set', async () => {
        // Create the route handler
        const { GET } = createToolsRoutes();
        
        // Create a test request
        const req = createTestRequest('GET', 'http://localhost/api/tools/test-set/test-server');
        
        // Execute the handler with params
        const response = await GET(req, createParams({ 
          setId: 'test-set', 
          serverId: 'test-server' 
        }));
        
        // Validate the response
        validateResponse(response);
        const data = await getResponseData(response);
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.id).toBe('test-server');
        expect(data.data.config).toBeDefined();
        expect(data.data.config.command).toBe('node');
      });
      
      it('should return 404 for non-existent set', async () => {
        // Create the route handler
        const { GET } = createToolsRoutes();
        
        // Create a test request
        const req = createTestRequest('GET', 'http://localhost/api/tools/nonexistent');
        
        // Execute the handler with params
        const response = await GET(req, createParams({ setId: 'nonexistent' }));
        
        // Validate the response
        validateResponse(response, 404);
        const data = await getResponseData(response);
        
        // Check the error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe('RESOURCE_NOT_FOUND');
      });
    });
    
    describe('POST', () => {
      it('should create a new tool set', async () => {
        // Create the route handler
        const { POST } = createToolsRoutes();
        
        // Create a test request with set data
        const setData = { name: 'new-test-set' };
        const req = createTestRequest('POST', 'http://localhost/api/tools', setData);
        
        // Execute the handler
        const response = await POST(req);
        
        // Validate the response
        validateResponse(response, 201);
        const data = await getResponseData(response);
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.id).toBe('new-test-set');
        
        // Verify set exists in the manager
        const sets = await testEnv.mandrakeManager.tools.listConfigSets();
        expect(sets).toContain('new-test-set');
      });
      
      it('should add a server to an existing set', async () => {
        // Create the route handler
        const { POST } = createToolsRoutes();
        
        // Create a test request with server data
        const serverData = {
          serverId: 'new-test-server',
          config: {
            command: 'echo',
            args: ['Hello, World!'],
            disabled: true
          }
        };
        const req = createTestRequest('POST', 'http://localhost/api/tools/test-set', serverData);
        
        // Execute the handler with params
        const response = await POST(req, createParams({ setId: 'test-set' }));
        
        // Validate the response
        validateResponse(response, 201);
        const data = await getResponseData(response);
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.id).toBe('new-test-server');
        expect(data.data.setId).toBe('test-set');
        expect(data.data.config).toEqual(serverData.config);
        
        // Verify server exists in the set
        const set = await testEnv.mandrakeManager.tools.getConfigSet('test-set');
        expect(set).toHaveProperty('new-test-server');
      });
      
      it('should return 409 for duplicate tool set', async () => {
        // Create the route handler
        const { POST } = createToolsRoutes();
        
        // Create a test request with existing set name
        const setData = { name: 'test-set' };
        const req = createTestRequest('POST', 'http://localhost/api/tools', setData);
        
        // Execute the handler
        const response = await POST(req);
        
        // Validate the response
        validateResponse(response, 409);
        const data = await getResponseData(response);
        
        // Check the error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe('CONFLICT');
      });
    });
    
    describe('PUT', () => {
      it('should update a server config', async () => {
        // Create the route handler
        const { PUT } = createToolsRoutes();
        
        // Create a test request with updated config
        const configUpdate = {
          command: 'echo',
          args: ['Updated config'],
          disabled: false
        };
        const req = createTestRequest('PUT', 'http://localhost/api/tools/test-set/test-server', configUpdate);
        
        // Execute the handler with params
        const response = await PUT(req, createParams({ 
          setId: 'test-set', 
          serverId: 'test-server' 
        }));
        
        // Validate the response
        validateResponse(response);
        const data = await getResponseData(response);
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.id).toBe('test-server');
        expect(data.data.setId).toBe('test-set');
        expect(data.data.config.command).toBe('echo');
        expect(data.data.config.args).toEqual(['Updated config']);
        
        // Verify config was updated
        const config = await testEnv.mandrakeManager.tools.getServerConfig('test-set', 'test-server');
        expect(config.command).toBe('echo');
        expect(config.args).toEqual(['Updated config']);
      });
      
      it('should set a tool set as active', async () => {
        // Create the route handler
        const { PUT } = createToolsRoutes();
        
        // Create a test request
        const req = createTestRequest('PUT', 'http://localhost/api/tools/test-set', {});
        
        // Execute the handler with params
        const response = await PUT(req, createParams({ setId: 'test-set' }));
        
        // Validate the response
        validateResponse(response);
        const data = await getResponseData(response);
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.active).toBe('test-set');
        
        // Verify active set was updated
        const activeSet = await testEnv.mandrakeManager.tools.getActive();
        expect(activeSet).toBe('test-set');
      });
      
      it('should return 404 for non-existent set or server', async () => {
        // Create the route handler
        const { PUT } = createToolsRoutes();
        
        // Create a test request
        const req = createTestRequest('PUT', 'http://localhost/api/tools/nonexistent/server', {
          command: 'echo'
        });
        
        // Execute the handler with params
        const response = await PUT(req, createParams({ 
          setId: 'nonexistent', 
          serverId: 'server' 
        }));
        
        // Validate the response
        validateResponse(response, 404);
        const data = await getResponseData(response);
        
        // Check the error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe('RESOURCE_NOT_FOUND');
      });
    });
    
    describe('DELETE', () => {
      it('should remove a server from a set', async () => {
        // Create the route handler
        const { DELETE } = createToolsRoutes();
        
        // Create a test request
        const req = createTestRequest('DELETE', 'http://localhost/api/tools/test-set/test-server');
        
        // Execute the handler with params
        const response = await DELETE(req, createParams({ 
          setId: 'test-set', 
          serverId: 'test-server' 
        }));
        
        // Validate the response
        validateResponse(response, 204);
        
        // Verify server was removed
        const set = await testEnv.mandrakeManager.tools.getConfigSet('test-set');
        expect(set).not.toHaveProperty('test-server');
      });
      
      it('should remove an entire tool set', async () => {
        // Create the route handler
        const { DELETE } = createToolsRoutes();
        
        // Create a test set specifically for deletion
        await testEnv.mandrakeManager.tools.addConfigSet('delete-set', {});
        
        // Create a test request
        const req = createTestRequest('DELETE', 'http://localhost/api/tools/delete-set');
        
        // Execute the handler with params
        const response = await DELETE(req, createParams({ setId: 'delete-set' }));
        
        // Validate the response
        validateResponse(response, 204);
        
        // Verify set was removed
        const sets = await testEnv.mandrakeManager.tools.listConfigSets();
        expect(sets).not.toContain('delete-set');
      });
      
      it('should return 404 for non-existent set or server', async () => {
        // Create the route handler
        const { DELETE } = createToolsRoutes();
        
        // Create a test request
        const req = createTestRequest('DELETE', 'http://localhost/api/tools/nonexistent/server');
        
        // Execute the handler with params
        const response = await DELETE(req, createParams({ 
          setId: 'nonexistent', 
          serverId: 'server' 
        }));
        
        // Validate the response
        validateResponse(response, 404);
        const data = await getResponseData(response);
        
        // Check the error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe('RESOURCE_NOT_FOUND');
      });
    });
  });
  
  describe('createToolsRoutes (Workspace Level)', () => {
    // Setup initial tool configs
    beforeEach(async () => {
      // Add a test tool set to the workspace
      await testEnv.workspace.tools.addConfigSet('ws-test-set', {});
      
      // Add a server to the test set
      await testEnv.workspace.tools.addServerConfig('ws-test-set', 'ws-test-server', {
        command: 'node',
        args: ['-e', 'console.log("Test server")'],
        disabled: true
      });
    });
    
    describe('GET', () => {
      it('should list all workspace tool sets', async () => {
        // Create the route handler
        const { GET } = createToolsRoutes(true);
        
        // Create a test request
        const req = createTestRequest('GET', `http://localhost/api/workspaces/${testEnv.workspace.id}/tools`);
        
        // Execute the handler with workspace ID
        const response = await GET(req, createParams({ id: testEnv.workspace.id }));
        
        // Validate the response
        validateResponse(response);
        const data = await getResponseData(response);
        
        // Check the response data
        expect(data.success).toBe(true);
        expect(data.data.sets).toContain('ws-test-set');
        expect(data.data.active).toBeDefined();
      });
      
      it('should require a workspace ID', async () => {
        // Create the route handler
        const { GET } = createToolsRoutes(true);
        
        // Create a test request without workspace ID
        const req = createTestRequest('GET', 'http://localhost/api/workspaces/tools');
        
        // Execute the handler without params
        const response = await GET(req);
        
        // Validate the response
        validateResponse(response, 400);
        const data = await getResponseData(response);
        
        // Check the error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe('BAD_REQUEST');
      });
    });
  });
  
  describe('createActiveToolsRoutes', () => {
    beforeEach(async () => {
      // Setup a test active tool set
      await testEnv.mandrakeManager.tools.addConfigSet('active-set', {
        'active-server': {
          command: 'echo',
          args: ['Active server'],
          disabled: false
        }
      });
      
      // Set it as active
      await testEnv.mandrakeManager.tools.setActive('active-set');
    });
    
    it('should get the active tool set', async () => {
      // Create the route handler
      const { GET } = createActiveToolsRoutes();
      
      // Create a test request
      const req = createTestRequest('GET', 'http://localhost/api/tools/active');
      
      // Execute the handler
      const response = await GET(req);
      
      // Validate the response
      validateResponse(response);
      const data = await getResponseData(response);
      
      // Check the response data
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('active-set');
      expect(data.data.servers).toBeInstanceOf(Array);
      expect(data.data.servers.length).toBe(1);
      expect(data.data.servers[0].id).toBe('active-server');
      expect(data.data.servers[0].status).toBe('inactive');
    });
  });
  
  describe('createServerStatusRoutes', () => {
    // Mock MCP server behavior
    beforeEach(() => {
      // Mock MCP getServer to return a mock for 'running-server'
      (testEnv.mcpManager.getServer as any) = vi.fn((name) => {
        if (name === 'running-server') {
          return {
            getState: () => ({
              logs: ['Server started', 'Running fine'],
              error: undefined
            }),
            getConfig: () => ({
              command: 'echo',
              args: ['Running server']
            })
          };
        }
        return null;
      });
    });
    
    it('should get status for a running server', async () => {
      // Create the route handler
      const { GET } = createServerStatusRoutes();
      
      // Create a test request
      const req = createTestRequest('GET', 'http://localhost/api/tools/running-server/status');
      
      // Execute the handler with params
      const response = await GET(req, createParams({ serverName: 'running-server' }));
      
      // Validate the response
      validateResponse(response);
      const data = await getResponseData(response);
      
      // Check the response data
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('running-server');
      expect(data.data.status).toBe('active');
      expect(data.data.logs).toEqual(['Server started', 'Running fine']);
    });
    
    it('should return inactive status for non-running server', async () => {
      // Create the route handler
      const { GET } = createServerStatusRoutes();
      
      // Create a test request
      const req = createTestRequest('GET', 'http://localhost/api/tools/inactive-server/status');
      
      // Execute the handler with params
      const response = await GET(req, createParams({ serverName: 'inactive-server' }));
      
      // Validate the response
      validateResponse(response);
      const data = await getResponseData(response);
      
      // Check the response data
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('inactive-server');
      expect(data.data.status).toBe('inactive');
    });
  });
  
  describe('createServerMethodsRoutes', () => {
    // Mock MCP server behavior for methods listing
    beforeEach(() => {
      (testEnv.mcpManager.getServer as any) = vi.fn((name) => {
        if (name === 'running-server') {
          return {
            listTools: () => Promise.resolve([
              {
                name: 'test-method',
                description: 'A test method',
                schema: { type: 'object', properties: {} }
              },
              {
                name: 'another-method',
                description: 'Another test method',
                schema: { type: 'object', properties: {} }
              }
            ])
          };
        }
        return null;
      });
    });
    
    it('should list methods for a running server', async () => {
      // Create the route handler
      const { GET } = createServerMethodsRoutes();
      
      // Create a test request
      const req = createTestRequest('GET', 'http://localhost/api/tools/running-server/methods');
      
      // Execute the handler with params
      const response = await GET(req, createParams({ serverName: 'running-server' }));
      
      // Validate the response
      validateResponse(response);
      const data = await getResponseData(response);
      
      // Check the response data
      expect(data.success).toBe(true);
      expect(data.data.server).toBe('running-server');
      expect(data.data.methods).toBeInstanceOf(Array);
      expect(data.data.methods.length).toBe(2);
      expect(data.data.methods[0].name).toBe('test-method');
      expect(data.data.methods[1].name).toBe('another-method');
    });
    
    it('should return 503 for non-running server', async () => {
      // Create the route handler
      const { GET } = createServerMethodsRoutes();
      
      // Create a test request
      const req = createTestRequest('GET', 'http://localhost/api/tools/nonexistent/methods');
      
      // Execute the handler with params
      const response = await GET(req, createParams({ serverName: 'nonexistent' }));
      
      // Validate the response
      validateResponse(response, 503);
      const data = await getResponseData(response);
      
      // Check the error data
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });
  
  // Additional tests for method execution routes would be similar
});
