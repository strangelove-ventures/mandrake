import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModelsHandler } from '@/lib/api/handlers/ModelsHandler';
import { ApiError, ErrorCode } from '@/lib/api/middleware/errorHandling';
import { NextRequest } from 'next/server';
import { WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory } from '@mandrake/workspace/tests/utils/utils';

describe('ModelsHandler', () => {
  let testDir: any;
  let workspaceManager: WorkspaceManager;
  let workspaceHandler: ModelsHandler;
  let systemHandler: ModelsHandler;
  
  beforeEach(async () => {
    // Create a temporary workspace for testing
    testDir = await createTestDirectory();
    workspaceManager = new WorkspaceManager(testDir.path, 'test-workspace');
    await workspaceManager.init('Test workspace for API testing');
    
    // Create handlers
    workspaceHandler = new ModelsHandler('test-workspace', workspaceManager);
    systemHandler = new ModelsHandler(); // System handler with no workspace
  });
  
  afterEach(async () => {
    // Clean up the test workspace
    if (testDir) {
      await testDir.cleanup();
    }
  });

  describe('listModels', () => {
    it('should throw ApiError for system-level models', async () => {
      await expect(systemHandler.listModels()).rejects.toThrow(ApiError);
      
      try {
        await systemHandler.listModels();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.NOT_IMPLEMENTED);
        expect((error as ApiError).status).toBe(501);
      }
    });

    it('should list workspace models', async () => {
      const models = await workspaceHandler.listModels();
      expect(typeof models).toBe('object');
      
      // Models manager initializes with default models
      expect(Object.keys(models).length).toBeGreaterThan(0);
    });
  });
  
  describe('listProviders', () => {
    it('should throw ApiError for system-level providers', async () => {
      await expect(systemHandler.listProviders()).rejects.toThrow(ApiError);
    });
    
    it('should list workspace providers', async () => {
      const providers = await workspaceHandler.listProviders();
      expect(typeof providers).toBe('object');
      
      // Providers manager initializes with default providers
      expect(Object.keys(providers).length).toBeGreaterThan(0);
    });
  });

  describe('addModel', () => {
    it('should throw ApiError for system-level model creation', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          enabled: true,
          providerId: 'anthropic',
          modelId: 'claude-3-opus-20240229',
          config: {
            temperature: 0.7,
            maxTokens: 4096
          }
        })
      } as NextRequest;
      
      await expect(systemHandler.addModel('test-model', mockRequest)).rejects.toThrow(ApiError);
    });
  });
  
  describe('addProvider', () => {
    it('should throw ApiError for system-level provider creation', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          type: 'anthropic',
          apiKey: 'sk-test-123'
        })
      } as NextRequest;
      
      await expect(systemHandler.addProvider('test-provider', mockRequest)).rejects.toThrow(ApiError);
    });
  });

  describe('getModelDetails', () => {
    it('should throw ApiError if model not found', async () => {
      // Use a non-existent model ID
      const nonexistentId = 'nonexistent-model';
      
      await expect(workspaceHandler.getModelDetails(nonexistentId)).rejects.toThrow(ApiError);
      
      try {
        await workspaceHandler.getModelDetails(nonexistentId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      }
    });
    
    it('should get an existing model', async () => {
      // Get the list of models first
      const models = await workspaceHandler.listModels();
      const firstModelId = Object.keys(models)[0];
      
      if (firstModelId) {
        const model = await workspaceHandler.getModelDetails(firstModelId);
        expect(model).toBeDefined();
        expect(model.modelId).toBeDefined();
      }
    });
  });
  
  describe('getProviderDetails', () => {
    it('should throw ApiError if provider not found', async () => {
      const nonexistentId = 'nonexistent-provider';
      
      await expect(workspaceHandler.getProviderDetails(nonexistentId)).rejects.toThrow(ApiError);
    });
    
    it('should get an existing provider', async () => {
      // Get the list of providers first
      const providers = await workspaceHandler.listProviders();
      const firstProviderId = Object.keys(providers)[0];
      
      if (firstProviderId) {
        const provider = await workspaceHandler.getProviderDetails(firstProviderId);
        expect(provider).toBeDefined();
        expect(provider.type).toBeDefined();
      }
    });
  });

  describe('updateModel', () => {
    it('should throw ApiError if model not found for update', async () => {
      const nonexistentId = 'nonexistent-model';
      
      const mockRequest = {
        json: () => Promise.resolve({ 
          enabled: false
        })
      } as NextRequest;
      
      await expect(workspaceHandler.updateModel(nonexistentId, mockRequest)).rejects.toThrow(ApiError);
    });
  });
  
  describe('updateProvider', () => {
    it('should throw ApiError if provider not found for update', async () => {
      const nonexistentId = 'nonexistent-provider';
      
      const mockRequest = {
        json: () => Promise.resolve({ 
          apiKey: 'new-key'
        })
      } as NextRequest;
      
      await expect(workspaceHandler.updateProvider(nonexistentId, mockRequest)).rejects.toThrow(ApiError);
    });
  });

  describe('removeModel', () => {
    it('should throw ApiError if model not found for removal', async () => {
      const nonexistentId = 'nonexistent-model';
      
      await expect(workspaceHandler.removeModel(nonexistentId)).rejects.toThrow(ApiError);
    });
  });
  
  describe('removeProvider', () => {
    it('should throw ApiError if provider not found for removal', async () => {
      const nonexistentId = 'nonexistent-provider';
      
      await expect(workspaceHandler.removeProvider(nonexistentId)).rejects.toThrow(ApiError);
    });
  });
  
  describe('getActiveModel', () => {
    it('should throw ApiError for system-level active model', async () => {
      await expect(systemHandler.getActiveModel()).rejects.toThrow(ApiError);
    });
    
    it('should get the active model ID', async () => {
      const activeModelId = await workspaceHandler.getActiveModel();
      expect(typeof activeModelId).toBe('string');
    });
  });
  
  describe('setActiveModel', () => {
    it('should throw ApiError for system-level active model setting', async () => {
      await expect(systemHandler.setActiveModel('test-model')).rejects.toThrow(ApiError);
    });
    
    it('should set the active model ID', async () => {
      // Use a known valid model ID
      const activeModelId = await workspaceHandler.getActiveModel();
      
      // Just verify the method doesn't throw
      await workspaceHandler.setActiveModel(activeModelId);
      
      // Verify it was set
      const newActiveId = await workspaceHandler.getActiveModel();
      expect(newActiveId).toBe(activeModelId);
    });
  });
});