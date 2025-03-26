import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { WorkspaceManagerAdapter } from '../../../src/services/registry/adapters/workspace-manager-adapter';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { WorkspaceManager } from '@mandrake/workspace';
import { ConsoleLogger } from '@mandrake/utils';

describe('WorkspaceManagerAdapter', () => {
  let tempDir: string;
  let workspaceManager: WorkspaceManager;
  let adapter: WorkspaceManagerAdapter;
  let workspaceId: string;
  let logger: ConsoleLogger;
  
  beforeEach(async () => {
    // Create temp directory for testing
    tempDir = await mkdtemp(join(tmpdir(), 'ws-adapter-test-'));
    
    // Generate a unique ID for the workspace
    workspaceId = crypto.randomUUID();
    
    // Create a real WorkspaceManager
    workspaceManager = new WorkspaceManager(tempDir, 'test-workspace', workspaceId);
    
    // Create a real logger
    logger = new ConsoleLogger({
      meta: { 
        service: 'WorkspaceManagerAdapter',
        workspaceId,
        workspaceName: 'test-workspace'
      }
    });
    
    // Create adapter with real WorkspaceManager
    adapter = new WorkspaceManagerAdapter(workspaceManager, {
      logger
    });
  });
  
  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  });
  
  describe('init', () => {
    test('should initialize the WorkspaceManager', async () => {
      // Using a real WorkspaceManager should successfully initialize
      await adapter.init();
      
      expect(adapter.isInitialized()).toBe(true);
      
      // Verify the workspace directory structure was created
      const wsStatus = await adapter.getStatus();
      expect(wsStatus.details.fileSystem.rootExists).toBe(true);
      expect(wsStatus.details.fileSystem.wsDirExists).toBe(true);
      expect(wsStatus.details.fileSystem.configExists).toBe(true);
    });
    
    test('should not re-initialize if already initialized', async () => {
      await adapter.init();
      
      // Create a spy to track calls to the original init method
      const originalInit = workspaceManager.init;
      let initCallCount = 0;
      
      workspaceManager.init = async () => {
        initCallCount++;
        return await originalInit.call(workspaceManager);
      };
      
      await adapter.init(); // Second call should be a no-op
      
      expect(initCallCount).toBe(0); // No additional calls to init
      expect(adapter.isInitialized()).toBe(true);
    });
  });
  
  describe('cleanup', () => {
    test('should clean up and mark as not initialized', async () => {
      // Initialize first
      await adapter.init();
      
      // Then clean up
      await adapter.cleanup();
      
      // Should be marked as not initialized
      expect(adapter.isInitialized()).toBe(false);
    });
    
    test('should not attempt cleanup if not initialized', async () => {
      // Skip initialization
      
      // Attempt cleanup - should be a no-op
      await adapter.cleanup();
      
      // Should remain not initialized
      expect(adapter.isInitialized()).toBe(false);
    });
  });
  
  describe('getStatus', () => {
    test('should report healthy status when initialized', async () => {
      await adapter.init();
      
      const status = await adapter.getStatus();
      
      expect(status.isHealthy).toBe(true);
      expect(status.statusCode).toBe(200);
      expect(status.message).toContain('is healthy');
      expect(status.details.initialized).toBe(true);
      expect(status.details.fileSystem.rootExists).toBe(true);
      expect(status.details.fileSystem.wsDirExists).toBe(true);
      expect(status.details.fileSystem.configExists).toBe(true);
    });
    
    test('should report unhealthy when not initialized', async () => {
      const status = await adapter.getStatus();
      
      expect(status.isHealthy).toBe(false);
      expect(status.statusCode).toBe(503);
      expect(status.message).toBe('WorkspaceManager not initialized');
    });
  });
  
  describe('getManager', () => {
    test('should return the original WorkspaceManager', () => {
      const manager = adapter.getManager();
      expect(manager).toBe(workspaceManager);
    });
  });
});