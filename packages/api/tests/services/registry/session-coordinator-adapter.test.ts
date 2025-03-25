import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { SessionCoordinatorAdapter } from '../../../src/services/registry/adapters/session-coordinator-adapter';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import { ConsoleLogger } from '@mandrake/utils';
import { MandrakeManager } from '@mandrake/workspace';
import { join } from 'path';
import { withTempDir } from '../../utils';
import tmp from 'tmp';
import { rm } from 'fs/promises';

describe('SessionCoordinatorAdapter', () => {
  let adapter: SessionCoordinatorAdapter;
  let coordinator: SessionCoordinator;
  let mandrakeManager: MandrakeManager;
  let mcpManager: MCPManager;
  let tempDir: string;
  const sessionId = 'test-session-123';

  beforeEach(async () => {
    // Create a temp directory for testing
    tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
    
    // Set up real dependencies
    mandrakeManager = new MandrakeManager(tempDir);
    await mandrakeManager.init();
    
    mcpManager = new MCPManager();
    
    // Create a real SessionCoordinator with the dependencies
    coordinator = new SessionCoordinator({
      metadata: {
        name: 'test-workspace',
        path: tempDir
      },
      promptManager: mandrakeManager.prompt,
      sessionManager: mandrakeManager.sessions,
      mcpManager: mcpManager,
      modelsManager: mandrakeManager.models
    });
    
    // Create the adapter
    adapter = new SessionCoordinatorAdapter(
      coordinator,
      sessionId,
      {
        logger: new ConsoleLogger(),
        isSystem: true,
        workspaceName: 'Test Workspace'
      }
    );
  });

  afterEach(async () => {
    // Clean up services
    try {
      await mcpManager.cleanup();
    } catch (error) {
      console.error('Error cleaning up MCP manager:', error);
    }
    
    // Clean up temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error removing temp directory:', error);
    }
  });

  test('should initialize successfully', async () => {
    await adapter.init();
    expect(adapter.isInitialized()).toBe(true);
  });

  test('should clean up successfully', async () => {
    // Initialize first
    await adapter.init();
    expect(adapter.isInitialized()).toBe(true);

    // Then clean up
    await adapter.cleanup();
    expect(adapter.isInitialized()).toBe(false);
  });

  test('should return healthy status when initialized', async () => {
    await adapter.init();
    const status = adapter.getStatus();
    
    expect(status.isHealthy).toBe(true);
    expect(status.statusCode).toBe(200);
    expect(status.details).toBeDefined();
    expect(status.details.sessionId).toBe(sessionId);
    expect(status.details.initialized).toBe(true);
  });

  test('should track activity state correctly', async () => {
    await adapter.init();
    
    // Initially inactive
    expect(adapter.getStatus().details.isActive).toBe(false);
    
    // Mark as active
    adapter.markActive();
    expect(adapter.getStatus().details.isActive).toBe(true);
    
    // Mark as inactive
    adapter.markInactive();
    expect(adapter.getStatus().details.isActive).toBe(false);
  });

  test('should track idle time correctly', async () => {
    await adapter.init();
    
    // Initial idle time should be very small
    const initialIdleTime = adapter.getIdleTimeMs();
    expect(initialIdleTime).toBeLessThan(1000);
    
    // Wait a bit and check again
    await new Promise(resolve => setTimeout(resolve, 100));
    const laterIdleTime = adapter.getIdleTimeMs();
    expect(laterIdleTime).toBeGreaterThan(initialIdleTime);
  });

  test('should provide access to the underlying coordinator', async () => {
    await adapter.init();
    const retrievedCoordinator = adapter.getCoordinator();
    expect(retrievedCoordinator).toBe(coordinator);
  });
  
  test('should allow building context', async () => {
    await adapter.init();
    
    // Record initial activity time
    const initialActivityTime = adapter.getStatus().details.lastActivityTime;
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Build context (should succeed even without a real session)
    try {
      // This will likely throw due to no session, but we're just testing that the method is proxied
      await adapter.buildContext(sessionId);
    } catch (error) {
      // Expected error because the test session doesn't exist in the database
      // We're still checking that lastActivityTime was updated below
    }
    
    // Check that activity time was updated
    const newActivityTime = adapter.getStatus().details.lastActivityTime;
    expect(newActivityTime).toBeGreaterThan(initialActivityTime);
  });
});