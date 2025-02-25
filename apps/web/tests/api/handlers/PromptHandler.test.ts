import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PromptHandler } from '@/lib/api/handlers/PromptHandler';
import { ApiError, ErrorCode } from '@/lib/api/middleware/errorHandling';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';

describe('PromptHandler', () => {
  let testDir;
  let workspaceManager: WorkspaceManager;
  let workspaceHandler: PromptHandler;
  let systemHandler: PromptHandler;
  
  beforeEach(async () => {
    // Create a temporary workspace for testing
    testDir = await createTestDirectory();
    workspaceManager = new WorkspaceManager(testDir.path, 'test-workspace');
    await workspaceManager.init('Test workspace for API testing');
    
    // Create handlers
    workspaceHandler = new PromptHandler('test-workspace', workspaceManager);
    systemHandler = new PromptHandler(); // System handler with no workspace
  });
  
  afterEach(async () => {
    // Clean up the test workspace
    if (testDir) {
      await testDir.cleanup();
    }
  });

  describe('getConfig', () => {
    it('should throw ApiError for system-level prompt config', async () => {
      await expect(systemHandler.getConfig()).rejects.toThrow(ApiError);
      
      try {
        await systemHandler.getConfig();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.NOT_IMPLEMENTED);
        expect((error as ApiError).status).toBe(501);
      }
    });

    it('should return workspace prompt config', async () => {
      const config = await workspaceHandler.getConfig();
      
      expect(config).toBeDefined();
      expect(typeof config.instructions).toBe('string');
      expect(typeof config.includeSystemInfo).toBe('boolean');
      expect(typeof config.includeDateTime).toBe('boolean');
      expect(typeof config.includeWorkspaceMetadata).toBe('boolean');
    });
  });

  describe('updateConfig', () => {
    it('should throw ApiError for system-level prompt config update', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          instructions: 'Test instructions',
          includeSystemInfo: true,
          includeDateTime: true,
          includeWorkspaceMetadata: true
        })
      } as NextRequest;
      
      await expect(systemHandler.updateConfig(mockRequest)).rejects.toThrow(ApiError);
    });
    
    it('should update workspace prompt config', async () => {
      const originalConfig = await workspaceHandler.getConfig();
      
      // Create new config with changed values
      const newConfig = {
        instructions: 'Test prompt instructions',
        includeSystemInfo: !originalConfig.includeSystemInfo,
        includeDateTime: !originalConfig.includeDateTime,
        includeWorkspaceMetadata: !originalConfig.includeWorkspaceMetadata
      };
      
      const mockRequest = {
        json: () => Promise.resolve(newConfig)
      } as NextRequest;
      
      await workspaceHandler.updateConfig(mockRequest);
      
      // Verify config was updated
      const updatedConfig = await workspaceHandler.getConfig();
      
      expect(updatedConfig.instructions).toBe(newConfig.instructions);
      expect(updatedConfig.includeSystemInfo).toBe(newConfig.includeSystemInfo);
      expect(updatedConfig.includeDateTime).toBe(newConfig.includeDateTime);
      expect(updatedConfig.includeWorkspaceMetadata).toBe(newConfig.includeWorkspaceMetadata);
    });
  });
});