/**
 * Tests for service helpers
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { 
  getSessionCoordinatorForRequest, 
  getWorkspaceManagerForRequest,
  getMCPManagerForRequest,
  releaseSessionResources,
  releaseWorkspaceResources,
  triggerResourceCleanup
} from '../../src/lib/services/helpers';
import { getServiceRegistry } from '../../src/lib/services/registry';
import { createTempDir, cleanupTempDir } from '../utils/test-dir';
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';

describe('Service Helpers', () => {
  // Global timeout constants
  const MCP_TEST_TIMEOUT = 30_000;
  const SESSION_TEST_TIMEOUT = 30_000;
  const RESOURCE_CLEANUP_TIMEOUT = 30_000;
  
  let tempDirPath: string;
  
  beforeEach(async () => {
    // Create a fresh temporary directory
    tempDirPath = await createTempDir();
    
    // Clear module cache to reset singletons
    try {
      delete require.cache[require.resolve('../../src/lib/services/registry')];
      delete require.cache[require.resolve('../../src/lib/services/helpers')];
      delete require.cache[require.resolve('../../src/lib/services/init')];
    } catch (error) {
      console.warn('Could not reset modules', error);
    }
  });
  
  afterEach(async () => {
    // Clean up resources
    try {
      const registry = getServiceRegistry();
      await registry.performCleanup();
    } catch (error) {
      console.warn('Error during cleanup', error);
    }
    
    // Clean up the temporary directory
    await cleanupTempDir(tempDirPath);
  });
  
  describe('getWorkspaceManagerForRequest', () => {
    test('should return a workspace manager', async () => {
      const workspaceName = 'test-workspace';
      const workspacePath = tempDirPath;
      
      const manager = await getWorkspaceManagerForRequest(workspaceName, workspacePath);
      
      expect(manager).toBeInstanceOf(WorkspaceManager);
      expect(manager.paths.root).toContain(workspaceName);
    });
    
    test('should return the same workspace manager for the same workspace', async () => {
      const workspaceName = 'test-workspace';
      const workspacePath = tempDirPath;
      
      const manager1 = await getWorkspaceManagerForRequest(workspaceName, workspacePath);
      const manager2 = await getWorkspaceManagerForRequest(workspaceName, workspacePath);
      
      expect(manager2).toBe(manager1);
    });
  });
  
  describe('getMCPManagerForRequest', () => {
    test('should return an MCP manager', async () => {
      const workspaceName = 'test-workspace';
      const workspacePath = tempDirPath;
      
      // Initialize workspace first
      const workspace = await getWorkspaceManagerForRequest(workspaceName, workspacePath);
      await workspace.init('Test workspace');
      
      const mcpManager = await getMCPManagerForRequest(workspaceName, workspacePath);
      
      expect(mcpManager).toBeInstanceOf(MCPManager);
    }, MCP_TEST_TIMEOUT);
    
    test('should create a workspace manager if needed', async () => {
      const workspaceName = 'test-workspace';
      const workspacePath = tempDirPath;
      
      // Get MCP manager without initializing workspace first
      const mcpManager = await getMCPManagerForRequest(workspaceName, workspacePath);
      
      expect(mcpManager).toBeInstanceOf(MCPManager);
      
      // Verify workspace was created
      const manager = await getWorkspaceManagerForRequest(workspaceName, workspacePath);
      expect(manager).toBeInstanceOf(WorkspaceManager);
    }, MCP_TEST_TIMEOUT);
  });
  
  describe('getSessionCoordinatorForRequest', () => {
    test('should return a session coordinator', async () => {
      const workspaceName = 'test-workspace';
      const workspacePath = tempDirPath;
      const sessionId = 'test-session';
      
      // Initialize workspace first
      const workspace = await getWorkspaceManagerForRequest(workspaceName, workspacePath);
      await workspace.init('Test workspace');
      
      const coordinator = await getSessionCoordinatorForRequest(workspaceName, workspacePath, sessionId);
      
      expect(coordinator).toBeInstanceOf(SessionCoordinator);
    }, SESSION_TEST_TIMEOUT);
    
    test('should create necessary managers', async () => {
      const workspaceName = 'test-workspace';
      const workspacePath = tempDirPath;
      const sessionId = 'test-session';
      
      // Get session coordinator without initializing anything first
      await getSessionCoordinatorForRequest(workspaceName, workspacePath, sessionId);
      
      // Verify workspace and MCP managers were created
      const registry = getServiceRegistry();
      
      // Get the managers and verify they exist
      const workspace = await registry.getWorkspaceManager(workspaceName, workspacePath);
      expect(workspace).toBeInstanceOf(WorkspaceManager);
      
      const mcpManager = await registry.getMCPManager(workspaceName, workspacePath);
      expect(mcpManager).toBeInstanceOf(MCPManager);
    }, SESSION_TEST_TIMEOUT);
    
    test('should return the same coordinator for the same session', async () => {
      const workspaceName = 'test-workspace';
      const workspacePath = tempDirPath;
      const sessionId = 'test-session';
      
      // Initialize workspace first
      const workspace = await getWorkspaceManagerForRequest(workspaceName, workspacePath);
      await workspace.init('Test workspace');
      
      const coordinator1 = await getSessionCoordinatorForRequest(workspaceName, workspacePath, sessionId);
      const coordinator2 = await getSessionCoordinatorForRequest(workspaceName, workspacePath, sessionId);
      
      expect(coordinator2).toBe(coordinator1);
    });
  });
  
  describe('releaseSessionResources', () => {
    test('should clean up a session', async () => {
      const workspaceName = 'test-workspace';
      const workspacePath = tempDirPath;
      const sessionId = 'test-session';
      
      // Initialize workspace
      const workspace = await getWorkspaceManagerForRequest(workspaceName, workspacePath);
      await workspace.init('Test workspace');
      
      // Create a session
      const coordinator = await getSessionCoordinatorForRequest(workspaceName, workspacePath, sessionId);
      
      // Create a spy on the cleanup method
      const originalCleanup = coordinator.cleanup;
      let cleanupCalled = false;
      
      coordinator.cleanup = async function() {
        cleanupCalled = true;
        return await originalCleanup.call(this);
      };
      
      // Release the session
      await releaseSessionResources(workspaceName, sessionId);
      
      // Verify cleanup was called
      expect(cleanupCalled).toBe(true);
      
      // Verify session was removed from registry
      const registry = getServiceRegistry();
      
      // Create a new session with the same ID - it should be a different instance
      const newCoordinator = await registry.getSessionCoordinator(workspaceName, workspacePath, sessionId);
      expect(newCoordinator).not.toBe(coordinator);
    }, SESSION_TEST_TIMEOUT);
    
    test('should do nothing if session does not exist', async () => {
      // Using direct try-catch approach instead of expect().resolves
      let errorThrown = false;
      
      try {
        await releaseSessionResources('non-existent', 'non-existent');
      } catch (error) {
        errorThrown = true;
      }
      
      // No error should be thrown
      expect(errorThrown).toBe(false);
    });
  });
  
  describe('releaseWorkspaceResources', () => {
    test('should clean up a workspace and its resources', async () => {
      const workspaceName = 'test-workspace';
      const workspacePath = tempDirPath;
      
      // Initialize workspace
      const workspace = await getWorkspaceManagerForRequest(workspaceName, workspacePath);
      await workspace.init('Test workspace');
      
      // Create MCP manager
      const mcpManager = await getMCPManagerForRequest(workspaceName, workspacePath);
      
      // Create sessions
      const session1 = await getSessionCoordinatorForRequest(workspaceName, workspacePath, 'session1');
      const session2 = await getSessionCoordinatorForRequest(workspaceName, workspacePath, 'session2');
      
      // Create spies
      const originalMcpCleanup = mcpManager.cleanup;
      let mcpCleanupCalled = false;
      
      mcpManager.cleanup = async function() {
        mcpCleanupCalled = true;
        return await originalMcpCleanup.call(this);
      };
      
      const originalSession1Cleanup = session1.cleanup;
      let session1CleanupCalled = false;
      
      session1.cleanup = async function() {
        session1CleanupCalled = true;
        return await originalSession1Cleanup.call(this);
      };
      
      const originalSession2Cleanup = session2.cleanup;
      let session2CleanupCalled = false;
      
      session2.cleanup = async function() {
        session2CleanupCalled = true;
        return await originalSession2Cleanup.call(this);
      };
      
      // Release workspace resources
      await releaseWorkspaceResources(workspaceName);
      
      // Verify all resources were cleaned up
      expect(mcpCleanupCalled).toBe(true);
      expect(session1CleanupCalled).toBe(true);
      expect(session2CleanupCalled).toBe(true);
      
      // Verify resources are no longer in the registry
      const registry = getServiceRegistry();
      
      // Create new resources with the same IDs - they should be different instances
      const newWorkspace = await registry.getWorkspaceManager(workspaceName, workspacePath);
      expect(newWorkspace).not.toBe(workspace);
      
      const newMcpManager = await registry.getMCPManager(workspaceName, workspacePath);
      expect(newMcpManager).not.toBe(mcpManager);
    }, RESOURCE_CLEANUP_TIMEOUT);
    
    test('should do nothing if workspace does not exist', async () => {
      // Using direct try-catch approach instead of expect().resolves
      let errorThrown = false;
      
      try {
        await releaseWorkspaceResources('non-existent');
      } catch (error) {
        errorThrown = true;
      }
      
      // No error should be thrown
      expect(errorThrown).toBe(false);
    });
  });
  
  describe('triggerResourceCleanup', () => {
    test('should trigger cleanup of inactive resources', async () => {
      const registry = getServiceRegistry();
      
      // Create a spy on performCleanup
      const originalPerformCleanup = registry.performCleanup;
      let performCleanupCalled = false;
      
      registry.performCleanup = async function() {
        performCleanupCalled = true;
        return await originalPerformCleanup.call(this);
      };
      
      await triggerResourceCleanup();
      
      expect(performCleanupCalled).toBe(true);
    });
  });
});
