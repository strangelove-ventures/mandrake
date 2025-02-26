import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSessionRoutes } from '@/lib/api/factories/createSessionRoutes';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';
import * as workspaceUtils from '@/lib/api/utils/workspace';
import * as serviceHelpers from '@/lib/services/helpers';

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

describe('createSessionRoutes', () => {
  let testDir: any;
  let workspaceManager: WorkspaceManager;
  let workspaceId = 'test-workspace';
  
  // Spy on the workspace utils to inject our test workspace
  let getWorkspaceManagerSpy;
  let getWorkspaceManagerForRequestSpy;
  
  beforeEach(async () => {
    // Create a temporary workspace for testing
    testDir = await createTestDirectory();
    workspaceManager = new WorkspaceManager(testDir.path, workspaceId);
    await workspaceManager.init('Test workspace for API testing');
    
    // Spy on the workspace utils
    getWorkspaceManagerSpy = vi.spyOn(workspaceUtils, 'getWorkspaceManager')
      .mockImplementation(async (id) => {
        if (id === workspaceId) {
          return workspaceManager;
        }
        throw new Error(`Workspace not found: ${id}`);
      });
    
    vi.spyOn(workspaceUtils, 'getSystemWorkspaceManager')
      .mockImplementation(() => workspaceManager);
    
    // Mock the service helper to return our test workspace manager
    getWorkspaceManagerForRequestSpy = vi.spyOn(serviceHelpers, 'getWorkspaceManagerForRequest')
      .mockImplementation(async (id) => {
        return workspaceManager;
      });
    
    // Create a session coordinator mock for the service helper
    vi.spyOn(serviceHelpers, 'getSessionCoordinatorForRequest')
      .mockImplementation((workspace: string, path: string, sessionId: string): Promise<any> => {
        return Promise.resolve({
          handleRequest: vi.fn().mockResolvedValue(undefined),
          cleanup: vi.fn().mockResolvedValue(undefined)
        });
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

  describe('System-level routes', () => {
    it('GET should list sessions', async () => {
      const routes = createSessionRoutes();
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req);
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
    
    it('POST should create a new session', async () => {
      const routes = createSessionRoutes();
      const sessionData = {
        title: 'Test Session',
        description: 'A test session'
      };
      
      const req = createMockRequest('POST', sessionData);
      
      const response = await routes.POST(req);
      
      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.title).toBe('Test Session');
    });
  });

  describe('Workspace-level routes', () => {
    it('GET should list workspace sessions', async () => {
      const routes = createSessionRoutes(true);
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { id: workspaceId } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
    
    it('GET should get a specific session', async () => {
      // First create a session
      const session = await workspaceManager.sessions.createSession({
        title: 'Test Session',
        workspaceId
      });
      
      const routes = createSessionRoutes(true);
      const req = createMockRequest('GET');
      
      const response = await routes.GET(req, { 
        params: { 
          id: workspaceId,
          sessionId: session.id
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(session.id);
      expect(body.data.title).toBe('Test Session');
    });
    
    it('POST should create a new workspace session', async () => {
      const routes = createSessionRoutes(true);
      const sessionData = {
        title: 'Workspace Session',
        description: 'A workspace test session'
      };
      
      const req = createMockRequest('POST', sessionData);
      
      const response = await routes.POST(req, { 
        params: { id: workspaceId } 
      });
      
      expect(response.status).toBe(201);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.title).toBe('Workspace Session');
      expect(body.data.workspaceId).toBe(workspaceId);
    });
    
    it('PUT should update a session', async () => {
      // First create a session
      const session = await workspaceManager.sessions.createSession({
        title: 'Original Title',
        workspaceId
      });
      
      const routes = createSessionRoutes(true);
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description'
      };
      
      const req = createMockRequest('PUT', updateData);
      
      const response = await routes.PUT(req, { 
        params: { 
          id: workspaceId,
          sessionId: session.id
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.title).toBe('Updated Title');
      expect(body.data.description).toBe('Updated description');
    });
    
    it('DELETE should remove a session', async () => {
      // First create a session
      const session = await workspaceManager.sessions.createSession({
        title: 'Session to Delete',
        workspaceId
      });
      
      const routes = createSessionRoutes(true);
      const req = createMockRequest('DELETE');
      
      const response = await routes.DELETE(req, { 
        params: { 
          id: workspaceId,
          sessionId: session.id
        } 
      });
      
      expect(response.status).toBe(204);
      
      // Verify it was removed by trying to get it - should throw or return 404
      const getReq = createMockRequest('GET');
      const getResponse = await routes.GET(getReq, { 
        params: { 
          id: workspaceId,
          sessionId: session.id
        } 
      });
      
      expect(getResponse.status).toBe(404);
    });
    
    it('GET should return 404 for nonexistent resources', async () => {
      const routes = createSessionRoutes(true);
      const req = createMockRequest('GET');
      
      // Use a valid-looking UUID that doesn't exist
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      const response = await routes.GET(req, { 
        params: { 
          id: workspaceId,
          sessionId: nonExistentId
        } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });
  
  describe('Message endpoints', () => {
    it('POST should send a message to a session', async () => {
      // First create a session
      const session = await workspaceManager.sessions.createSession({
        title: 'Test Session',
        workspaceId
      });
      
      const routes = createSessionRoutes(true);
      const messageData = {
        content: 'Hello, world!'
      };
      
      const req = createMockRequest('POST', messageData);
      
      const response = await routes.POST(req, { 
        params: { 
          id: workspaceId,
          sessionId: session.id,
          messages: 'true'
        } 
      });
      
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body.success).toBe(true);
    });
    
    it('POST should validate message content', async () => {
      // First create a session
      const session = await workspaceManager.sessions.createSession({
        title: 'Test Session',
        workspaceId
      });
      
      const routes = createSessionRoutes(true);
      const emptyMessageData = {
        content: ''
      };
      
      const req = createMockRequest('POST', emptyMessageData);
      
      const response = await routes.POST(req, { 
        params: { 
          id: workspaceId,
          sessionId: session.id,
          messages: 'true'
        } 
      });
      
      expect(response.status).toBe(400); // Bad request for empty message
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
    
    it('POST should return 404 for nonexistent session', async () => {
      const routes = createSessionRoutes(true);
      const messageData = {
        content: 'Hello, world!'
      };
      
      const req = createMockRequest('POST', messageData);
      
      // Use a valid-looking UUID that doesn't exist
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      const response = await routes.POST(req, { 
        params: { 
          id: workspaceId,
          sessionId: nonExistentId,
          messages: 'true'
        } 
      });
      
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });
});
