import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DynamicContextHandler } from '@/lib/api/handlers/DynamicContextHandler';
import { ApiError, ErrorCode } from '@/lib/api/middleware/errorHandling';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';
import { DynamicContextMethodConfig } from '@mandrake/workspace';

describe('DynamicContextHandler', () => {
  let testDir;
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

    it('should list workspace contexts after adding some', async () => {
      // Add a test context directly to the workspace
      const testContext: DynamicContextMethodConfig = {
        name: 'Test Context',
        serverId: 'server1',
        methodName: 'method1',
        params: { param1: 'value1' },
        enabled: true
      };
      
      await workspaceManager.dynamic.create(testContext);
      
      const contexts = await workspaceHandler.listContexts();
      expect(contexts.length).toBe(1);
      expect(contexts[0].name).toBe('Test Context');
      expect(contexts[0].serverId).toBe('server1');
    });
  });

  describe('addContext', () => {
    it('should add a context to workspace and return ID', async () => {
      const testContext: DynamicContextMethodConfig = {
        name: 'Test Context',
        serverId: 'server1',
        methodName: 'method1',
        params: { param1: 'value1' },
        enabled: true
      };
      
      // Create a mock request
      const mockRequest = {
        json: () => Promise.resolve(testContext)
      } as NextRequest;
      
      const contextId = await workspaceHandler.addContext(mockRequest);
      
      // Should return a string ID
      expect(typeof contextId).toBe('string');
      expect(contextId.length).toBeGreaterThan(0);
      
      // Verify it was actually saved to the workspace
      const contexts = await workspaceManager.dynamic.list();
      expect(contexts.length).toBe(1);
      expect(contexts[0].id).toBe(contextId);
      expect(contexts[0].name).toBe(testContext.name);
    });

    it('should throw ApiError for system-level context creation', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          name: 'System Context',
          serverId: 'server1',
          methodName: 'method1'
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
    it('should get a workspace context by ID', async () => {
      // First create a context
      const testContext: DynamicContextMethodConfig = {
        name: 'Test Context',
        serverId: 'server1',
        methodName: 'method1',
        params: {}
      };
      
      const id = await workspaceManager.dynamic.create(testContext);
      
      // Now get it by ID
      const result = await workspaceHandler.getContextDetails(id);
      
      expect(result.id).toBe(id);
      expect(result.name).toBe(testContext.name);
    });

    it('should throw ApiError if context not found', async () => {
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
    it('should update a workspace context', async () => {
      // First create a context
      const initialContext: DynamicContextMethodConfig = {
        name: 'Initial Name',
        serverId: 'server1',
        methodName: 'method1',
        params: {}
      };
      
      const id = await workspaceManager.dynamic.create(initialContext);
      
      // Create update request
      const updateData = {
        name: 'Updated Name',
        params: { newParam: 'value' }
      };
      
      const mockRequest = {
        json: () => Promise.resolve(updateData)
      } as NextRequest;
      
      // Update the context (returns void)
      await workspaceHandler.updateContext(id, mockRequest);
      
      // Verify the update persisted
      const retrieved = await workspaceManager.dynamic.get(id);
      expect(retrieved?.name).toBe('Updated Name');
      expect(retrieved?.params).toEqual({ newParam: 'value' });
      expect(retrieved?.serverId).toBe('server1'); // Unchanged
    });

    it('should throw ApiError if context not found for update', async () => {
      const nonexistentId = 'nonexistent-id';
      
      const mockRequest = {
        json: () => Promise.resolve({ name: 'Updated Name' })
      } as NextRequest;
      
      await expect(workspaceHandler.updateContext(nonexistentId, mockRequest)).rejects.toThrow(ApiError);
    });
  });

  describe('removeContext', () => {
    it('should remove a workspace context', async () => {
      // First create a context
      const testContext: DynamicContextMethodConfig = {
        name: 'Test Context',
        serverId: 'server1',
        methodName: 'method1'
      };
      
      const id = await workspaceManager.dynamic.create(testContext);
      
      // Verify it exists
      const beforeRemoval = await workspaceManager.dynamic.list();
      expect(beforeRemoval.length).toBe(1);
      
      // Remove it
      await workspaceHandler.removeContext(id);
      
      // Verify it's gone
      const afterRemoval = await workspaceManager.dynamic.list();
      expect(afterRemoval.length).toBe(0);
    });

    it('should throw ApiError if context not found for removal', async () => {
      const nonexistentId = 'nonexistent-id';
      
      await expect(workspaceHandler.removeContext(nonexistentId)).rejects.toThrow(ApiError);
    });
  });
});