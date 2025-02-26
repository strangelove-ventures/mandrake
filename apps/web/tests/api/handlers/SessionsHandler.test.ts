import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionsHandler } from '@/lib/api/handlers/SessionsHandler';
import { ApiError, ErrorCode } from '@/lib/api/middleware/errorHandling';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';
import * as serviceHelpers from '@/lib/services/helpers';
import { SessionCoordinator } from '@mandrake/session';

describe('SessionsHandler', () => {
  let testDir: any;
  let workspaceManager: WorkspaceManager;
  let workspaceHandler: SessionsHandler;
  let systemHandler: SessionsHandler;
  
  // Mock the service helpers
  let getSessionCoordinatorMock: any;
  
  beforeEach(async () => {
    // Create a temporary workspace for testing
    testDir = await createTestDirectory();
    workspaceManager = new WorkspaceManager(testDir.path, 'test-workspace');
    await workspaceManager.init('Test workspace for API testing');
    
    // Create handlers
    workspaceHandler = new SessionsHandler('test-workspace', workspaceManager);
    systemHandler = new SessionsHandler(undefined, workspaceManager); // System handler using test workspace
    
    // Mock the session coordinator helper
    getSessionCoordinatorMock = vi.spyOn(serviceHelpers, 'getSessionCoordinatorForRequest')
      .mockImplementation((workspace: string, path: string, sessionId: string): Promise<any> => {
        return Promise.resolve({
          handleRequest: vi.fn().mockResolvedValue(undefined),
          cleanup: vi.fn().mockResolvedValue(undefined)
        });
      });
  });
  
  afterEach(async () => {
    // Clean up the test workspace
    if (testDir) {
      await testDir.cleanup();
    }
    
    // Restore all mocks
    vi.restoreAllMocks();
  });

  describe('listSessions / createSession / getSession', () => {
    it('should create, list, and get sessions', async () => {
      // Create a mock request with session data
      const mockRequest = {
        json: () => Promise.resolve({
          title: 'Test Session',
          description: 'A test session for API testing'
        })
      } as NextRequest;
      
      // Create a session
      const session = await workspaceHandler.createSession(mockRequest);
      
      // Verify session was created with correct data
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.title).toBe('Test Session');
      expect(session.description).toBe('A test session for API testing');
      expect(session.workspaceId).toBe('test-workspace');
      
      // List sessions
      const sessions = await workspaceHandler.listSessions();
      
      // Verify the session appears in the list
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions.find(s => s.id === session.id)).toBeDefined();
      
      // Get the session by ID
      const retrievedSession = await workspaceHandler.getSession(session.id);
      
      // Verify retrieved session matches created session
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession.id).toBe(session.id);
      expect(retrievedSession.title).toBe('Test Session');
      expect(retrievedSession.description).toBe('A test session for API testing');
    });
    
    it('should throw if session not found', async () => {
      // Use a valid-looking UUID that doesn't exist
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      await expect(workspaceHandler.getSession(nonExistentId)).rejects.toThrow();
    });
  });

  describe('updateSession', () => {
    it('should update a session', async () => {
      // Create a session first
      const createRequest = {
        json: () => Promise.resolve({
          title: 'Original Title',
          description: 'Original description'
        })
      } as NextRequest;
      
      const session = await workspaceHandler.createSession(createRequest);
      
      // Update the session
      const updateRequest = {
        json: () => Promise.resolve({
          title: 'Updated Title',
          description: 'Updated description'
        })
      } as NextRequest;
      
      const updatedSession = await workspaceHandler.updateSession(session.id, updateRequest);
      
      // Verify the update
      expect(updatedSession).toBeDefined();
      expect(updatedSession.id).toBe(session.id);
      expect(updatedSession.title).toBe('Updated Title');
      expect(updatedSession.description).toBe('Updated description');
      expect(updatedSession.workspaceId).toBe('test-workspace');
      
      // Get the session to verify persistence
      const retrievedSession = await workspaceHandler.getSession(session.id);
      expect(retrievedSession.title).toBe('Updated Title');
    });
    
    it('should throw when updating nonexistent session', async () => {
      const updateRequest = {
        json: () => Promise.resolve({
          title: 'Updated Title'
        })
      } as NextRequest;
      
      // Use a valid-looking UUID that doesn't exist
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      await expect(workspaceHandler.updateSession(nonExistentId, updateRequest)).rejects.toThrow();
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      // Create a session first
      const createRequest = {
        json: () => Promise.resolve({
          title: 'Session to Delete'
        })
      } as NextRequest;
      
      const session = await workspaceHandler.createSession(createRequest);
      
      // Verify session exists
      const beforeDelete = await workspaceHandler.listSessions();
      expect(beforeDelete.find(s => s.id === session.id)).toBeDefined();
      
      // Delete the session
      await workspaceHandler.deleteSession(session.id);
      
      // Verify session is gone
      const afterDelete = await workspaceHandler.listSessions();
      expect(afterDelete.find(s => s.id === session.id)).toBeUndefined();
      
      // Verify getSession throws
      await expect(workspaceHandler.getSession(session.id)).rejects.toThrow();
    });
    
    it('should throw when deleting nonexistent session', async () => {
      // Use a valid-looking UUID that doesn't exist
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      await expect(workspaceHandler.deleteSession(nonExistentId)).rejects.toThrow();
    });
  });
  
  describe('getMessages', () => {
    it('should get messages for a session', async () => {
      // Create a session first
      const createRequest = {
        json: () => Promise.resolve({
          title: 'Test Session'
        })
      } as NextRequest;
      
      const session = await workspaceHandler.createSession(createRequest);
      
      // Get messages (initially empty)
      const history = await workspaceHandler.getMessages(session.id);
      
      // Verify structure
      expect(history).toBeDefined();
      expect(history.session).toBeDefined();
      expect(history.session.id).toBe(session.id);
      expect(Array.isArray(history.rounds)).toBe(true);
    });
    
    it('should throw for nonexistent session', async () => {
      // Use a valid-looking UUID that doesn't exist
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      await expect(workspaceHandler.getMessages(nonExistentId)).rejects.toThrow();
    });
  });
  
  describe('sendMessage', () => {
    it('should send a message to a session', async () => {
      // Create a session first
      const createRequest = {
        json: () => Promise.resolve({
          title: 'Test Session'
        })
      } as NextRequest;
      
      const session = await workspaceHandler.createSession(createRequest);
      
      // Send a message
      const messageRequest = {
        json: () => Promise.resolve({
          content: 'Hello, world!'
        })
      } as NextRequest;
      
      // Call the sendMessage method
      await workspaceHandler.sendMessage(session.id, messageRequest);
      
      // Verify service helper was called - with any arguments
      expect(getSessionCoordinatorMock).toHaveBeenCalled();
    });
    
    it('should validate message content', async () => {
      // Create a session first
      const createRequest = {
        json: () => Promise.resolve({
          title: 'Test Session'
        })
      } as NextRequest;
      
      const session = await workspaceHandler.createSession(createRequest);
      
      // Empty message should be rejected
      const emptyMessageRequest = {
        json: () => Promise.resolve({
          content: ''
        })
      } as NextRequest;
      
      await expect(workspaceHandler.sendMessage(session.id, emptyMessageRequest)).rejects.toThrow();
    });
    
    it('should throw for nonexistent session', async () => {
      // Use a valid-looking UUID that doesn't exist
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      
      const messageRequest = {
        json: () => Promise.resolve({
          content: 'Hello, world!'
        })
      } as NextRequest;
      
      await expect(workspaceHandler.sendMessage(nonExistentId, messageRequest)).rejects.toThrow();
    });
  });
});
