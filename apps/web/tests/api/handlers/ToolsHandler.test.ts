import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolsHandler } from '@/lib/api/handlers/ToolsHandler';
import { ApiError, ErrorCode } from '@/lib/api/middleware/errorHandling';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';

describe('ToolsHandler', () => {
  let testDir: any;
  let workspaceManager: WorkspaceManager;
  let workspaceHandler: ToolsHandler;
  let systemHandler: ToolsHandler;
  
  beforeEach(async () => {
    // Create a temporary workspace for testing
    testDir = await createTestDirectory();
    workspaceManager = new WorkspaceManager(testDir.path, 'test-workspace');
    await workspaceManager.init('Test workspace for API testing');
    
    // Create handlers
    workspaceHandler = new ToolsHandler('test-workspace', workspaceManager);
    systemHandler = new ToolsHandler(); // System handler with no workspace
  });
  
  afterEach(async () => {
    // Clean up the test workspace
    if (testDir) {
      await testDir.cleanup();
    }
  });

  describe('listConfigSets', () => {
    it('should throw ApiError for system-level config sets', async () => {
      await expect(systemHandler.listConfigSets()).rejects.toThrow(ApiError);
      
      try {
        await systemHandler.listConfigSets();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.NOT_IMPLEMENTED);
        expect((error as ApiError).status).toBe(501);
      }
    });

    it('should list workspace config sets', async () => {
      const configSets = await workspaceHandler.listConfigSets();
      
      expect(Array.isArray(configSets)).toBe(true);
      expect(configSets.length).toBeGreaterThan(0);
      expect(configSets).toContain('default'); // Default set is always created
    });
  });

  describe('getActive', () => {
    it('should throw ApiError for system-level active set', async () => {
      await expect(systemHandler.getActive()).rejects.toThrow(ApiError);
    });
    
    it('should get workspace active config set', async () => {
      const activeSetId = await workspaceHandler.getActive();
      
      expect(typeof activeSetId).toBe('string');
      expect(activeSetId).toBe('default'); // Default is initially active
    });
  });
  
  describe('setActive', () => {
    it('should throw ApiError for system-level active set update', async () => {
      await expect(systemHandler.setActive('default')).rejects.toThrow(ApiError);
    });
    
    it('should set workspace active config set', async () => {
      const initialActive = await workspaceHandler.getActive();
      
      // Should be able to set to the same value without error
      await workspaceHandler.setActive(initialActive);
      
      const afterUpdate = await workspaceHandler.getActive();
      expect(afterUpdate).toBe(initialActive);
    });
    
    it('should throw if config set does not exist', async () => {
      await expect(workspaceHandler.setActive('nonexistent')).rejects.toThrow();
    });
  });

  describe('getConfigSet', () => {
    it('should throw ApiError for system-level config set', async () => {
      await expect(systemHandler.getConfigSet('default')).rejects.toThrow(ApiError);
    });
    
    it('should get workspace config set', async () => {
      const configSet = await workspaceHandler.getConfigSet('default');
      
      expect(configSet).toBeDefined();
      expect(typeof configSet).toBe('object');
      expect(configSet.ripper).toBeDefined();
      expect(configSet.ripper.command).toBe('bun');
    });
    
    it('should throw ApiError if config set not found', async () => {
      await expect(workspaceHandler.getConfigSet('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  describe('addConfigSet / updateConfigSet / removeConfigSet', () => {
    it('should throw ApiError for system-level operations', async () => {
      const mockRequest = {
        json: () => Promise.resolve({ test: { command: 'echo', args: ['test'] } })
      } as NextRequest;
      
      await expect(systemHandler.addConfigSet('test', mockRequest)).rejects.toThrow(ApiError);
      await expect(systemHandler.updateConfigSet('test', mockRequest)).rejects.toThrow(ApiError);
      await expect(systemHandler.removeConfigSet('test')).rejects.toThrow(ApiError);
    });
    
    it('should add/update/remove config set in workspace', async () => {
      const newConfigSetId = 'test-set';
      const configData = { 
        test: { 
          command: 'echo', 
          args: ['test'],
          disabled: false
        } 
      };
      
      const mockRequest = {
        json: () => Promise.resolve(configData)
      } as NextRequest;
      
      // Add new config set
      await workspaceHandler.addConfigSet(newConfigSetId, mockRequest);
      
      // Verify it was added
      const configSet = await workspaceHandler.getConfigSet(newConfigSetId);
      expect(configSet).toBeDefined();
      expect(configSet.test).toEqual(configData.test);
      
      // Update config set
      const updateData = {
        test: {
          disabled: true
        }
      };
      
      const updateRequest = {
        json: () => Promise.resolve(updateData)
      } as NextRequest;
      
      await workspaceHandler.updateConfigSet(newConfigSetId, updateRequest);
      
      // Verify update
      const updatedSet = await workspaceHandler.getConfigSet(newConfigSetId);
      expect(updatedSet.test.disabled).toBe(true); // Updated field
      expect(updatedSet.test.command).toBe('echo'); // Original field preserved
      
      // Remove config set
      await workspaceHandler.removeConfigSet(newConfigSetId);
      
      // Verify removal
      await expect(workspaceHandler.getConfigSet(newConfigSetId)).rejects.toThrow(ApiError);
    });
  });

  describe('getServerConfig / addServerConfig / updateServerConfig / removeServerConfig', () => {
    it('should throw ApiError for system-level operations', async () => {
      const mockRequest = {
        json: () => Promise.resolve({ command: 'echo', args: ['test'] })
      } as NextRequest;
      
      await expect(systemHandler.getServerConfig('default', 'test')).rejects.toThrow(ApiError);
      await expect(systemHandler.addServerConfig('default', 'test', mockRequest)).rejects.toThrow(ApiError);
      await expect(systemHandler.updateServerConfig('default', 'test', mockRequest)).rejects.toThrow(ApiError);
      await expect(systemHandler.removeServerConfig('default', 'test')).rejects.toThrow(ApiError);
    });
    
    it('should add/update/remove server config in workspace', async () => {
      const setId = 'default';
      const newServerId = 'test-server';
      const serverData = {
        command: 'echo',
        args: ['test']
      };
      
      const mockRequest = {
        json: () => Promise.resolve(serverData)
      } as NextRequest;
      
      // Add new server config
      await workspaceHandler.addServerConfig(setId, newServerId, mockRequest);
      
      // Verify it was added
      const serverConfig = await workspaceHandler.getServerConfig(setId, newServerId);
      expect(serverConfig).toEqual(serverData);
      
      // Update server config
      const updateData = {
        args: ['updated']
      };
      
      const updateRequest = {
        json: () => Promise.resolve(updateData)
      } as NextRequest;
      
      await workspaceHandler.updateServerConfig(setId, newServerId, updateRequest);
      
      // Verify update
      const updatedConfig = await workspaceHandler.getServerConfig(setId, newServerId);
      expect(updatedConfig.args).toEqual(['updated']); // Updated field
      expect(updatedConfig.command).toBe('echo'); // Original field preserved
      
      // Remove server config
      await workspaceHandler.removeServerConfig(setId, newServerId);
      
      // Verify removal
      await expect(workspaceHandler.getServerConfig(setId, newServerId)).rejects.toThrow(ApiError);
    });
    
    it('should throw ApiError for nonexistent config set or server', async () => {
      await expect(workspaceHandler.getServerConfig('nonexistent', 'ripper')).rejects.toThrow(ApiError);
      await expect(workspaceHandler.getServerConfig('default', 'nonexistent')).rejects.toThrow(ApiError);
    });
  });
});