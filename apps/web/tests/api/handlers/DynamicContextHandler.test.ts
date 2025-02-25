import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DynamicContextHandler } from '@/lib/api/handlers/DynamicContextHandler';
import { ApiError, ErrorCode } from '@/lib/api/middleware/errorHandling';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';

describe('DynamicContextHandler', () => {
  let testDir: any;
  let workspaceManager: WorkspaceManager;
  let workspaceHandler: DynamicContextHandler;
  let systemHandler: DynamicContextHandler;
  
  beforeEach(async () => {
    // Create a temporary workspace for testing
    testDir = await createTestDirectory();
    workspaceManager = new WorkspaceManager(testDir.path, 'test-workspace');
    await workspaceManager.init('Test workspace for API testing');
    
    // Create handlers
    workspaceHandler = new DynamicContextHandler('test-workspace', workspaceManager);
    systemHandler = new DynamicContextHandler(); // System handler with no workspace
  });
  
  afterEach(async () => {
    // Clean up the test workspace
    if (testDir) {
      await testDir.cleanup();
    }
  });

  describe('listContexts', () => {
    it('should throw ApiError for system-level contexts', async () => {
      await expect(systemHandler.listContexts()).rejects.toThrow(ApiError);
      
      try {
        await systemHandler.listContexts();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.NOT_IMPLEMENTED);
        expect((error as ApiError).status).toBe(501);
      }
    });

    it('should list workspace contexts when empty', async () => {
      const contexts = await workspaceHandler.listContexts();
      expect(contexts).toEqual([]);
    });
  });

  describe('addContext', () => {
    it('should throw ApiError for system-level context creation', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
          name: 'System Context',
          serverId: 'server1',
          methodName: 'method1',
          refresh: { enabled: true } // Required field
        })
      } as NextRequest;
      
      await expect(systemHandler.addContext(mockRequest)).rejects.toThrow(ApiError);
    });

    it('should throw ApiError with validation errors', async () => {
      // Missing required fields
      const invalidContext = {
        name: 'Test Context'
        // serverId and methodName are missing
      };
      
      // Create a mock request with invalid data
      const mockRequest = {
        json: () => Promise.resolve(invalidContext)
      } as NextRequest;
      
      await expect(workspaceHandler.addContext(mockRequest)).rejects.toThrow();
    });
  });

  describe('getContextDetails', () => {
    it('should throw ApiError if context not found', async () => {
      // Mock the get method to return null
      vi.spyOn(workspaceManager.dynamic, 'get').mockResolvedValue(undefined);
      
      const nonexistentId = 'nonexistent-id';
      
      await expect(workspaceHandler.getContextDetails(nonexistentId)).rejects.toThrow(ApiError);
      
      try {
        await workspaceHandler.getContextDetails(nonexistentId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      }
    });
  });

  describe('updateContext', () => {
    it('should throw ApiError if context not found for update', async () => {
      // Mock the get method to return null
      vi.spyOn(workspaceManager.dynamic, 'get').mockResolvedValue(undefined);
      
      const nonexistentId = 'nonexistent-id';
      
      const mockRequest = {
        json: () => Promise.resolve({ 
          name: 'Updated Name',
          refresh: { enabled: true }
        })
      } as NextRequest;
      
      await expect(workspaceHandler.updateContext(nonexistentId, mockRequest)).rejects.toThrow(ApiError);
    });
  });

  describe('removeContext', () => {
    it('should throw ApiError if context not found for removal', async () => {
      // Mock the get method to return null
      vi.spyOn(workspaceManager.dynamic, 'get').mockResolvedValue(undefined);
      
      const nonexistentId = 'nonexistent-id';
      
      await expect(workspaceHandler.removeContext(nonexistentId)).rejects.toThrow(ApiError);
    });
  });
});