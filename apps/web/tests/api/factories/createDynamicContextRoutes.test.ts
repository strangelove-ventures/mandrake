import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDynamicContextRoutes } from '@/lib/api/factories/createDynamicContextRoutes';
import { getMandrakeManager, getWorkspaceManagerById } from '@/lib/api/utils/workspace';
import { ApiError } from '@/lib/api/middleware/errorHandling';
import { NextRequest } from 'next/server';

// Create mock objects
const mockWorkspace = {
  id: 'ws1',
  name: 'workspace1',
  dynamic: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
};

// Mock the workspace utilities
vi.mock('@/lib/api/utils/workspace', () => ({
  getMandrakeManager: vi.fn(),
  getWorkspaceManagerById: vi.fn()
}));

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

describe('Dynamic Context Routes Factory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Configure mocks
    (getWorkspaceManagerById as any).mockResolvedValue(mockWorkspace);
    
    // Setup default return values
    mockWorkspace.dynamic.list.mockResolvedValue([
      { id: 'ctx1', serverId: 'ripper', methodName: 'listDirectory', params: { path: '/test' } },
      { id: 'ctx2', serverId: 'fetch', methodName: 'fetch', params: { url: 'https://example.com' } }
    ]);
    
    mockWorkspace.dynamic.get.mockImplementation((id) => {
      if (id === 'ctx1') {
        return Promise.resolve({
          id: 'ctx1',
          serverId: 'ripper',
          methodName: 'listDirectory',
          params: { path: '/test' }
        });
      }
      if (id === 'ctx2') {
        return Promise.resolve({
          id: 'ctx2',
          serverId: 'fetch',
          methodName: 'fetch',
          params: { url: 'https://example.com' }
        });
      }
      return Promise.resolve(null);
    });
    
    mockWorkspace.dynamic.create.mockImplementation((data) => {
      return Promise.resolve({
        id: 'new-ctx',
        ...data
      });
    });
    
    mockWorkspace.dynamic.update.mockImplementation((id, data) => {
      return Promise.resolve({
        id,
        ...data
      });
    });
    
    mockWorkspace.dynamic.delete.mockResolvedValue(undefined);
  });
  
  describe('Workspace-scoped dynamic contexts', () => {
    describe('GET', () => {
      it('should list all dynamic contexts', async () => {
        // Create the route handler
        const { GET } = createDynamicContextRoutes(true);
        
        // Create test request
        const req = createTestRequest('GET', 'http://localhost/api/workspaces/ws1/dynamic');
        
        // Execute handler with workspace ID
        const response = await GET(req, { params: { id: 'ws1' } });
        
        // Validate response
        expect(response.status).toBe(200);
        const data = await response.json();
        
        // Check response data
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBe(2);
        expect(data.data[0].id).toBe('ctx1');
        expect(data.data[1].id).toBe('ctx2');
        
        // Verify correct function was called
        expect(mockWorkspace.dynamic.list).toHaveBeenCalled();
        expect(getWorkspaceManagerById).toHaveBeenCalledWith('ws1');
      });
      
      it('should get a specific dynamic context', async () => {
        // Create the route handler
        const { GET } = createDynamicContextRoutes(true);
        
        // Create test request
        const req = createTestRequest('GET', 'http://localhost/api/workspaces/ws1/dynamic/ctx1');
        
        // Execute handler with workspace ID and context ID
        const response = await GET(req, { params: { id: 'ws1', contextId: 'ctx1' } });
        
        // Validate response
        expect(response.status).toBe(200);
        const data = await response.json();
        
        // Check response data
        expect(data.success).toBe(true);
        expect(data.data.id).toBe('ctx1');
        expect(data.data.serverId).toBe('ripper');
        
        // Verify correct function was called
        expect(mockWorkspace.dynamic.get).toHaveBeenCalledWith('ctx1');
        expect(getWorkspaceManagerById).toHaveBeenCalledWith('ws1');
      });
      
      it('should return 404 for non-existent context', async () => {
        // Mock get to return null for non-existent context
        mockWorkspace.dynamic.get.mockResolvedValue(null);
        
        // Create the route handler
        const { GET } = createDynamicContextRoutes(true);
        
        // Create test request
        const req = createTestRequest('GET', 'http://localhost/api/workspaces/ws1/dynamic/nonexistent');
        
        // Execute handler with workspace ID and context ID
        const response = await GET(req, { params: { id: 'ws1', contextId: 'nonexistent' } });
        
        // Validate response
        expect(response.status).toBe(404);
        const data = await response.json();
        
        // Check error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe('RESOURCE_NOT_FOUND');
      });
      
      it('should require a workspace ID', async () => {
        // Create the route handler
        const { GET } = createDynamicContextRoutes(true);
        
        // Create test request
        const req = createTestRequest('GET', 'http://localhost/api/workspaces/dynamic');
        
        // Execute handler without workspace ID
        const response = await GET(req, { params: {} });
        
        // Validate response
        expect(response.status).toBe(400);
        const data = await response.json();
        
        // Check error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe('BAD_REQUEST');
      });
    });
    
    describe('POST', () => {
      it('should create a new dynamic context', async () => {
        // Create the route handler
        const { POST } = createDynamicContextRoutes(true);
        
        // Create test request with context data
        const contextData = {
          serverId: 'ripper',
          methodName: 'listDirectory',
          params: { path: '/new-test' }
        };
        const req = createTestRequest('POST', 'http://localhost/api/workspaces/ws1/dynamic', contextData);
        
        // Execute handler with workspace ID
        const response = await POST(req, { params: { id: 'ws1' } });
        
        // Validate response
        expect(response.status).toBe(201);
        const data = await response.json();
        
        // Check response data
        expect(data.success).toBe(true);
        expect(data.data.id).toBe('new-ctx');
        expect(data.data.serverId).toBe('ripper');
        expect(data.data.methodName).toBe('listDirectory');
        expect(data.data.params.path).toBe('/new-test');
        
        // Verify correct function was called
        expect(mockWorkspace.dynamic.create).toHaveBeenCalledWith(contextData);
        expect(getWorkspaceManagerById).toHaveBeenCalledWith('ws1');
      });
      
      it('should validate request body', async () => {
        // Create the route handler
        const { POST } = createDynamicContextRoutes(true);
        
        // Create test request with invalid data (missing required fields)
        const invalidData = {
          // Missing serverId and methodName
          params: { path: '/test' }
        };
        const req = createTestRequest('POST', 'http://localhost/api/workspaces/ws1/dynamic', invalidData);
        
        // Execute handler with workspace ID
        const response = await POST(req, { params: { id: 'ws1' } });
        
        // Validate response
        expect(response.status).toBe(400);
        const data = await response.json();
        
        // Check error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe('VALIDATION_ERROR');
      });
    });
    
    describe('PUT', () => {
      it('should update a dynamic context', async () => {
        // Create the route handler
        const { PUT } = createDynamicContextRoutes(true);
        
        // Create test request with update data
        const updateData = {
          params: { path: '/updated-path' }
        };
        const req = createTestRequest('PUT', 'http://localhost/api/workspaces/ws1/dynamic/ctx1', updateData);
        
        // Execute handler with workspace ID and context ID
        const response = await PUT(req, { params: { id: 'ws1', contextId: 'ctx1' } });
        
        // Validate response
        expect(response.status).toBe(200);
        const data = await response.json();
        
        // Check response data
        expect(data.success).toBe(true);
        expect(data.data.id).toBe('ctx1');
        expect(data.data.params.path).toBe('/updated-path');
        
        // Verify correct function was called
        expect(mockWorkspace.dynamic.update).toHaveBeenCalledWith('ctx1', expect.objectContaining(updateData));
        expect(getWorkspaceManagerById).toHaveBeenCalledWith('ws1');
      });
      
      it('should return 404 for non-existent context', async () => {
        // Mock get to return null for non-existent context
        mockWorkspace.dynamic.get.mockResolvedValue(null);
        
        // Create the route handler
        const { PUT } = createDynamicContextRoutes(true);
        
        // Create test request with update data
        const updateData = {
          params: { path: '/updated-path' }
        };
        const req = createTestRequest('PUT', 'http://localhost/api/workspaces/ws1/dynamic/nonexistent', updateData);
        
        // Execute handler with workspace ID and context ID
        const response = await PUT(req, { params: { id: 'ws1', contextId: 'nonexistent' } });
        
        // Validate response
        expect(response.status).toBe(404);
        const data = await response.json();
        
        // Check error data
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.code).toBe('RESOURCE_NOT_FOUND');
      });
    });
    
    describe('DELETE', () => {
      it('should delete a dynamic context', async () => {
        // Create the route handler
        const { DELETE } = createDynamicContextRoutes(true);
        
        // Create test request
        const req = createTestRequest('DELETE', 'http://localhost/api/workspaces/ws1/dynamic/ctx1');
        
        // Execute handler with workspace ID and context ID
        const response = await DELETE(req, { params: { id: 'ws1', contextId: 'ctx1' } });
        
        // Validate response
        expect(response.status).toBe(204);
        
        // Verify correct function was called
        expect(mockWorkspace.dynamic.delete).toHaveBeenCalledWith('ctx1');
        expect(getWorkspaceManagerById).toHaveBeenCalledWith('ws1');
      });
    });
  });
  
  describe('System-level dynamic contexts', () => {
    it('should return 501 Not Implemented for system-level contexts', async () => {
      // Create the route handler
      const { GET } = createDynamicContextRoutes(false);
      
      // Create test request
      const req = createTestRequest('GET', 'http://localhost/api/dynamic');
      
      // Execute handler
      const response = await GET(req);
      
      // Validate response
      expect(response.status).toBe(501);
      const data = await response.json();
      
      // Check error data
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('NOT_IMPLEMENTED');
      expect(data.error.message).toContain('not yet supported');
    });
  });
});
