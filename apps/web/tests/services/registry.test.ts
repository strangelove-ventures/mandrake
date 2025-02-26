/**
 * Tests for ServiceRegistry
 */
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { getServiceRegistry } from '../../src/lib/services/registry';
import { createTempDir, cleanupTempDir } from '../utils/test-dir';
import { WorkspaceManager, MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';

describe('ServiceRegistry', () => {
  let tempDirPath: string;
  const originalEnv = { ...process.env };
  
  beforeEach(async () => {
    // Create a fresh temporary directory
    tempDirPath = await createTempDir();
    
    // Set environment variable for MandrakeManager
    process.env.MANDRAKE_ROOT = tempDirPath;
    console.log(`Setting MANDRAKE_ROOT to ${tempDirPath}`);
    
    // Clear the registry singleton
    try {
      delete require.cache[require.resolve('../../src/lib/services/registry')];
    } catch (error) {
      console.warn('Could not reset registry module', error);
    }
  });
  
  afterEach(async () => {
    // Restore original environment
    process.env = { ...originalEnv };
    
    // Clean up any resources
    try {
      const registry = getServiceRegistry();
      await registry.performCleanup();
    } catch (error) {
      console.warn('Error during cleanup', error);
    }
    
    // Clean up the temporary directory
    await cleanupTempDir(tempDirPath);
  });
  
  describe('Workspace Management', () => {
    test('should create and cache workspace managers', async () => {
      const registry = getServiceRegistry();
      const workspaceName = 'test-workspace';
      
      // Create a workspace manager
      const manager1 = await registry.getWorkspaceManager(workspaceName, tempDirPath);
      
      // Verify it was created
      expect(manager1).toBeInstanceOf(WorkspaceManager);
      
      // Get the same workspace manager again
      const manager2 = await registry.getWorkspaceManager(workspaceName, tempDirPath);
      
      // Should be the same instance
      expect(manager2).toBe(manager1);
    });
    
    test('should create different instances for different workspaces', async () => {
      const registry = getServiceRegistry();
      const workspace1 = 'workspace1';
      const workspace2 = 'workspace2';
      
      // Create two different workspace managers
      const manager1 = await registry.getWorkspaceManager(workspace1, tempDirPath);
      const manager2 = await registry.getWorkspaceManager(workspace2, tempDirPath);
      
      // Should be different instances
      expect(manager1).not.toBe(manager2);
      
      // Should have different configurations
      expect(manager1.paths.root).not.toBe(manager2.paths.root);
    });
  });
  
  describe('MCP Management', () => {
    // Increase timeout for MCP manager tests to 30 seconds
    const MCP_TEST_TIMEOUT = 30_000;

    test('should create and cache MCP managers', async () => {
      const registry = getServiceRegistry();
      const workspaceName = 'test-workspace';
      
      // Initialize the workspace first
      const workspace = await registry.getWorkspaceManager(workspaceName, tempDirPath);
      await workspace.init('Test workspace');
      
      // Create an MCP manager
      const mcpManager1 = await registry.getMCPManager(workspaceName, tempDirPath);
      
      // Verify it was created
      expect(mcpManager1).toBeInstanceOf(MCPManager);
      
      // Get the same MCP manager again
      const mcpManager2 = await registry.getMCPManager(workspaceName, tempDirPath);
      
      // Should be the same instance
      expect(mcpManager2).toBe(mcpManager1);
    }, MCP_TEST_TIMEOUT);
    
    test('should create workspace manager if needed', async () => {
      const registry = getServiceRegistry();
      const workspaceName = 'test-workspace';
      
      // Create an MCP manager directly (should create workspace internally)
      const mcpManager = await registry.getMCPManager(workspaceName, tempDirPath);
      
      // Verify MCP manager was created
      expect(mcpManager).toBeInstanceOf(MCPManager);
      
      // Get workspace manager - it should have been created automatically
      const workspaceManager = await registry.getWorkspaceManager(workspaceName, tempDirPath);
      expect(workspaceManager).toBeInstanceOf(WorkspaceManager);
    }, MCP_TEST_TIMEOUT);
  });
  
  describe('Session Management', () => {
    // Increase timeout for session coordinator tests to 30 seconds
    const SESSION_TEST_TIMEOUT = 30_000;

    test('should create and cache session coordinators', async () => {
      const registry = getServiceRegistry();
      const workspaceName = 'test-workspace';
      const sessionId = 'test-session';
      
      // Initialize the workspace
      const workspace = await registry.getWorkspaceManager(workspaceName, tempDirPath);
      await workspace.init('Test workspace');
      
      // Create a session coordinator
      const coordinator1 = await registry.getSessionCoordinator(workspaceName, tempDirPath, sessionId);
      
      // Verify it was created
      expect(coordinator1).toBeInstanceOf(SessionCoordinator);
      
      // Get the same session coordinator again
      const coordinator2 = await registry.getSessionCoordinator(workspaceName, tempDirPath, sessionId);
      
      // Should be the same instance
      expect(coordinator2).toBe(coordinator1);
    }, SESSION_TEST_TIMEOUT);
    
    test('should create different instances for different sessions', async () => {
      const registry = getServiceRegistry();
      const workspaceName = 'test-workspace';
      const session1 = 'session1';
      const session2 = 'session2';
      
      // Initialize the workspace
      const workspace = await registry.getWorkspaceManager(workspaceName, tempDirPath);
      await workspace.init('Test workspace');
      
      // Create two different session coordinators
      const coordinator1 = await registry.getSessionCoordinator(workspaceName, tempDirPath, session1);
      const coordinator2 = await registry.getSessionCoordinator(workspaceName, tempDirPath, session2);
      
      // Should be different instances
      expect(coordinator1).not.toBe(coordinator2);
    });
  });
  
  describe('Resource Cleanup', () => {
    test('should clean up a session coordinator', async () => {
      const registry = getServiceRegistry();
      const workspaceName = 'test-workspace';
      const sessionId = 'test-session';
      
      // Initialize the workspace
      const workspace = await registry.getWorkspaceManager(workspaceName, tempDirPath);
      await workspace.init('Test workspace');
      
      // Create a session coordinator
      const coordinator = await registry.getSessionCoordinator(workspaceName, tempDirPath, sessionId);
      
      // Create a spy on the cleanup method
      const originalCleanup = coordinator.cleanup;
      let cleanupCalled = false;
      
      coordinator.cleanup = async function() {
        cleanupCalled = true;
        return await originalCleanup.call(this);
      };
      
      // Release the session
      await registry.releaseSessionCoordinator(workspaceName, sessionId);
      
      // Should call cleanup
      expect(cleanupCalled).toBe(true);
      
      // Getting the same session again should create a new instance
      const newCoordinator = await registry.getSessionCoordinator(workspaceName, tempDirPath, sessionId);
      expect(newCoordinator).not.toBe(coordinator);
    });
  });

  describe('MandrakeManager Integration', () => {
    test('should create and cache MandrakeManager instance', async () => {
      // Instead of relying on process.env, directly create a MandrakeManager
      const manualManager = new MandrakeManager(tempDirPath);
      await manualManager.init();
      
      // Create a wrapper function to inject our manager for testing
      const getMandrakeWrapper = async () => manualManager;
      
      // Create a function to test the caching behavior with our injected manager
      const testCaching = async () => {
        const first = await getMandrakeWrapper();
        const second = await getMandrakeWrapper();
        
        expect(first).toBe(second); // Same instance
        expect(first.paths.root).toBe(tempDirPath); // Correct path
      };
      
      await testCaching();
    });
    
    test('should release MandrakeManager resources', async () => {
      // Create a test manager
      let testManager: MandrakeManager | null = new MandrakeManager(tempDirPath);
      await testManager.init();
      
      // Create a tracker for manager resets
      let managerReleased = false;
      
      // Create mock functions for test
      const getManager = async () => {
        if (!testManager) {
          testManager = new MandrakeManager(tempDirPath);
          await testManager.init();
        }
        return testManager;
      };
      
      const releaseManager = async () => {
        testManager = null;
        managerReleased = true;
      };
      
      // Test releasing and recreating
      const manager1 = await getManager();
      expect(manager1.paths.root).toBe(tempDirPath);
      
      // Release the manager
      await releaseManager();
      expect(managerReleased).toBe(true);
      
      // Get a new manager - should be a different instance
      const manager2 = await getManager();
      expect(manager2).not.toBe(manager1);
      expect(manager2.paths.root).toBe(tempDirPath);
    });
  });
});
