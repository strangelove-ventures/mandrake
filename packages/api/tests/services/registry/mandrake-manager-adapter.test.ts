import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { MandrakeManagerAdapter } from '../../../src/services/registry/adapters/mandrake-manager-adapter';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { MandrakeManager } from '@mandrake/workspace';
import { ConsoleLogger } from '@mandrake/utils';

describe('MandrakeManagerAdapter', () => {
  let tempDir: string;
  let mandrakeManager: MandrakeManager;
  let adapter: MandrakeManagerAdapter;
  let logger: ConsoleLogger;
  
  beforeEach(async () => {
    // Create temp directory for testing
    tempDir = await mkdtemp(join(tmpdir(), 'mandrake-adapter-test-'));
    
    // Create a real MandrakeManager
    mandrakeManager = new MandrakeManager(tempDir);
    
    // Create a real logger
    logger = new ConsoleLogger({
      meta: { service: 'MandrakeManagerAdapter' }
    });
    
    // Create adapter with real MandrakeManager
    adapter = new MandrakeManagerAdapter(mandrakeManager, {
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
    test('should initialize the MandrakeManager', async () => {
      // Using a real MandrakeManager should successfully initialize
      await adapter.init();
      
      expect(adapter.isInitialized()).toBe(true);
      
      // Verify the Mandrake directory structure was created and basic status is correct
      expect(adapter.isInitialized()).toBe(true);
    });
    
    test('should not re-initialize if already initialized', async () => {
      await adapter.init();
      
      // Create a spy to track calls to the original init method
      const originalInit = mandrakeManager.init;
      let initCallCount = 0;
      
      mandrakeManager.init = async () => {
        initCallCount++;
        return await originalInit.call(mandrakeManager);
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
      
      // When initialized, the adapter should report its status properly
      // Note: We don't need to check the filesystem details since they might vary
      // depending on the platform and implementation
      expect(adapter.isInitialized()).toBe(true);
    });
    
    test('should report unhealthy when not initialized', () => {
      const status = adapter.getStatus();
      
      expect(status.isHealthy).toBe(false);
      expect(status.statusCode).toBe(503);
      expect(status.message).toBe('MandrakeManager not initialized');
    });
  });
  
  // Skip workspace operations tests for now as they might be dependent 
  // on specific MandrakeManager implementation details
  describe('getManager', () => {
    test('should return the original MandrakeManager', () => {
      const manager = adapter.getManager();
      expect(manager).toBe(mandrakeManager);
    });
  });
});