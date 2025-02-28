import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { createTestDirectory, TestDirectory } from '../../utils/test-dir';
import { ApiError, ErrorCode } from '@/lib/api/middleware/errorHandling';

// Import the functions to test
import { 
  getMandrakeManager,
  getWorkspaceManagerById,
  createSystemSessionCoordinator,
  createWorkspaceSessionCoordinator,
  getMCPManager,
  resetManagersForTesting
} from '@/lib/api/utils/workspace';

// Test suite for workspace utility functions
describe('Workspace Utility', () => {
  // Define test variables at a higher scope
  let testDir: TestDirectory;
  let originalEnv: string | undefined;

  // Set up test environment before each test
  beforeEach(async () => {
    // Store original environment variable
    originalEnv = process.env.MANDRAKE_ROOT;
    
    // Each test gets a fresh test directory
    testDir = await createTestDirectory('api-test-');
    
    // Reset singleton instances
    resetManagersForTesting();
  });
  
  // Clean up after each test
  afterEach(async () => {
    // Clean up test directory
    await testDir.cleanup();
    
    // Restore original environment variable
    if (originalEnv) {
      process.env.MANDRAKE_ROOT = originalEnv;
    } else {
      delete process.env.MANDRAKE_ROOT;
    }
    
    // Reset singleton instances
    resetManagersForTesting();
  });
  
  // Tests for getMandrakeManager
  describe('getMandrakeManager', () => {
    test('should return a MandrakeManager instance', () => {
      // Set the environment variable for this test
      process.env.MANDRAKE_ROOT = testDir.path;
      
      const manager = getMandrakeManager();
      expect(manager).toBeInstanceOf(MandrakeManager);
      expect(manager.paths.root).toBe(testDir.path);
    });
    
    test('should return the same instance on repeated calls', () => {
      // Set the environment variable for this test
      process.env.MANDRAKE_ROOT = testDir.path;
      
      const manager1 = getMandrakeManager();
      const manager2 = getMandrakeManager();
      expect(manager1).toBe(manager2);
    });
  });
  
  // Tests for getMCPManager
  describe('getMCPManager', () => {
    test('should return an MCPManager instance', () => {
      const manager = getMCPManager();
      expect(manager).toBeDefined();
      expect(typeof manager.startServer).toBe('function');
      expect(typeof manager.stopServer).toBe('function');
    });
    
    test('should return the same instance on repeated calls', () => {
      const manager1 = getMCPManager();
      const manager2 = getMCPManager();
      expect(manager1).toBe(manager2);
    });
  });
  
  // Tests for getWorkspaceManagerById
  describe('getWorkspaceManagerById', () => {
    test('should return a workspace manager by ID', async () => {
      // Create a fresh test directory
      process.env.MANDRAKE_ROOT = testDir.path;
      
      // Reset managers to ensure we get a fresh instance
      resetManagersForTesting();
      
      // Get mandrake manager and initialize it
      const mandrakeManager = getMandrakeManager();
      await mandrakeManager.init();
      
      // Create a test workspace with unique name
      const workspaceName = `test-workspace-${Date.now()}`;
      const workspaceManager = await mandrakeManager.createWorkspace(workspaceName);
      
      // Test the function
      const retrievedWorkspace = await getWorkspaceManagerById(workspaceManager.id);
      expect(retrievedWorkspace).toBeInstanceOf(WorkspaceManager);
      expect(retrievedWorkspace.id).toBe(workspaceManager.id);
      expect(retrievedWorkspace.name).toBe(workspaceName);
    });
    
    test('should throw ApiError if workspace not found', async () => {
      // Create a fresh test directory
      process.env.MANDRAKE_ROOT = testDir.path;
      
      // Reset managers to ensure we get a fresh instance
      resetManagersForTesting();
      
      // Get mandrake manager and initialize it
      const mandrakeManager = getMandrakeManager();
      await mandrakeManager.init();
      
      // Test with non-existent ID
      try {
        await getWorkspaceManagerById('nonexistent-id');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
        expect((error as ApiError).status).toBe(404);
      }
    });
  });
  
  // Tests for createSystemSessionCoordinator
  describe('createSystemSessionCoordinator', () => {
    test('should create a system session coordinator', async () => {
      // Create a fresh test directory
      process.env.MANDRAKE_ROOT = testDir.path;
      
      // Reset managers to ensure we get a fresh instance
      resetManagersForTesting();
      
      // Initialize mandrake manager
      const mandrakeManager = getMandrakeManager();
      await mandrakeManager.init();
      
      // Test the function
      const coordinator = createSystemSessionCoordinator();
      
      // Verify the coordinator was created correctly
      expect(coordinator).toBeDefined();
      expect(coordinator.opts).toBeDefined();
      expect(coordinator.opts.metadata.name).toBe('system');
      expect(coordinator.opts.metadata.path).toBe(testDir.path);
      expect(coordinator.opts.promptManager).toBe(mandrakeManager.prompt);
      expect(coordinator.opts.sessionManager).toBe(mandrakeManager.sessions);
      expect(coordinator.opts.modelsManager).toBe(mandrakeManager.models);
      
      // System level doesn't have files or dynamic contexts
      expect(coordinator.opts.filesManager).toBeUndefined();
      expect(coordinator.opts.dynamicContextManager).toBeUndefined();
    });
  });
  
  // Tests for createWorkspaceSessionCoordinator
  describe('createWorkspaceSessionCoordinator', () => {
    test('should create a workspace session coordinator', async () => {
      // Create a fresh test directory
      process.env.MANDRAKE_ROOT = testDir.path;
      
      // Reset managers to ensure we get a fresh instance
      resetManagersForTesting();
      
      // Initialize mandrake manager
      const mandrakeManager = getMandrakeManager();
      await mandrakeManager.init();
      
      // Create a test workspace with unique name
      const workspaceName = `test-workspace-${Date.now()}`;
      const workspaceManager = await mandrakeManager.createWorkspace(workspaceName);
      
      // Test the function
      const coordinator = createWorkspaceSessionCoordinator(workspaceManager);
      
      // Verify the coordinator was created correctly
      expect(coordinator).toBeDefined();
      expect(coordinator.opts).toBeDefined();
      expect(coordinator.opts.metadata.name).toBe(workspaceName);
      expect(coordinator.opts.metadata.path).toBe(workspaceManager.paths.root);
      expect(coordinator.opts.promptManager).toBe(workspaceManager.prompt);
      expect(coordinator.opts.sessionManager).toBe(workspaceManager.sessions);
      expect(coordinator.opts.filesManager).toBe(workspaceManager.files);
      expect(coordinator.opts.dynamicContextManager).toBe(workspaceManager.dynamic);
    });
  });
});
