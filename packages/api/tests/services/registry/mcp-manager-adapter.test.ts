import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { MCPManager } from '@mandrake/mcp';
import { ConsoleLogger } from '@mandrake/utils';
import { MCPManagerAdapter } from '../../../src/services/registry/adapters/mcp-manager-adapter';
import type { ServerConfig } from '@mandrake/utils';

// Helper for creating test directories
interface TestDirectory {
  path: string;
  cleanup: () => Promise<void>;
}

async function createTestDirectory(prefix: string = 'mcp-adapter-test-'): Promise<TestDirectory> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  return {
    path,
    cleanup: async () => {
      await rm(path, { recursive: true, force: true });
    }
  };
}

// Server configuration factory for Docker-based servers
const SERVER_CONFIGS = (testDirPath: string): Record<string, ServerConfig> => ({
  filesystem: {
    command: 'docker',
    args: [
      'run',
      '--rm',
      '-i',
      '--mount',
      `type=bind,src=${testDirPath},dst=/projects/tmp`,
      'mcp/filesystem',
      '/projects'
    ]
  },
  fetch: {
    command: 'docker',
    args: [
      'run',
      '--rm',
      '-i',
      'mcp/fetch'
    ]
  },
  memory: {
    command: 'docker',
    args: [
      'run', 
      '-i', 
      '-v', 
      'claude-memory:/app/dist', 
      '--rm', 
      'mcp/memory'
    ]
  }
});

describe('MCPManagerAdapter', () => {
  let testDir: TestDirectory;
  let mcpManager: MCPManager;
  let adapter: MCPManagerAdapter;
  let configs: Record<string, ServerConfig>;
  
  // Setup for all tests
  beforeAll(async () => {
    // Create test directory
    testDir = await createTestDirectory();
    
    // Create any subdirectories needed
    await mkdir(join(testDir.path, 'filesystem-tests'), { recursive: true });
    
    // Create configs using the test directory
    configs = SERVER_CONFIGS(testDir.path);
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    await testDir.cleanup();
  });
  
  // Setup before each test
  beforeEach(() => {
    mcpManager = new MCPManager();
  });
  
  // Cleanup after each test
  afterEach(async () => {
    if (adapter?.isInitialized()) {
      await adapter.cleanup();
    } else {
      await mcpManager.cleanup();
    }
  });
  
  test('MCPManagerAdapter initializes correctly with configuration', async () => {
    
    // Create adapter with filesystem config
    adapter = new MCPManagerAdapter(
      mcpManager,
      { 'filesystem-server': configs.filesystem },
      'init-test',
      { 
        logger: new ConsoleLogger({
          meta: { test: 'init-test' }
        }),
        isSystem: true
      }
    );
    
    // Initialize the adapter
    await adapter.init();
    
    // Check that the adapter is initialized
    expect(adapter.isInitialized()).toBe(true);
    
    // Get status and verify
    const status = await adapter.getStatus();
    expect(status.details.configId).toBe('init-test');
    expect(status.details.isSystem).toBe(true);
    
    // Verify the adapter holds a reference to the MCPManager
    expect(adapter.getManager()).toBe(mcpManager);
  });
  
  test('MCPManagerAdapter spins up all three server types and lists tools', async () => {
    
    // Create a combined config with all server types
    const allServersConfig = {
      'filesystem-server': configs.filesystem,
      'fetch-server': configs.fetch,
      'memory-server': configs.memory,
      'disabled-server': {
        ...configs.filesystem,
        disabled: true
      }
    };
    
    // Create adapter with all servers
    adapter = new MCPManagerAdapter(
      mcpManager,
      allServersConfig,
      'all-servers-test'
    );
    
    // Initialize the adapter
    await adapter.init();
    
    // Verify adapter is initialized
    expect(adapter.isInitialized()).toBe(true);
    
    // All servers should be running in the adapter
    const status = await adapter.getStatus();
    expect(status.details.serverCount).toBe(3);
    expect(status.details.servers).toHaveProperty('filesystem-server');
    expect(status.details.servers).toHaveProperty('fetch-server');
    expect(status.details.servers).toHaveProperty('memory-server');
    expect(status.details.servers).not.toHaveProperty('disabled-server');
    
    // Check each server has tools
    const filesystemTools = await mcpManager.getServer('filesystem-server').listTools();
    expect(filesystemTools.length).toBeGreaterThan(0);
    
    const fetchTools = await mcpManager.getServer('fetch-server').listTools();
    expect(fetchTools.length).toBeGreaterThan(0);
    
    const memoryTools = await mcpManager.getServer('memory-server').listTools();
    expect(memoryTools.length).toBeGreaterThan(0);
    
    // Test filesystem server - write and read a file
    const writeResult = await mcpManager.invokeTool('filesystem-server', 'write_file', {
      path: '/projects/tmp/adapter-test.txt',
      content: 'Adapter test content'
    });
    expect(writeResult).toBeDefined();
    
    const readResult = await mcpManager.invokeTool('filesystem-server', 'read_file', {
      path: '/projects/tmp/adapter-test.txt'
    });
    
    expect(readResult.content[0].text).toBe('Adapter test content');
    
    // Verify all servers are running and health metrics are correct
    expect(status.details.healthSummary.totalServers).toBe(3);
    expect(status.details.healthSummary.runningServers).toBe(3);
  });
  
  test('MCPManagerAdapter cleanup stops all servers', async () => {
    
    // Create a config with multiple servers
    const multiServerConfig = {
      'filesystem-server': configs.filesystem,
      'fetch-server': configs.fetch
    };
    
    // Create adapter
    adapter = new MCPManagerAdapter(
      mcpManager,
      multiServerConfig,
      'cleanup-test'
    );
    
    // Initialize the adapter
    await adapter.init();
    
    // Verify adapter is initialized with servers
    expect(adapter.isInitialized()).toBe(true);
    const beforeStatus = await adapter.getStatus();
    expect(beforeStatus.details.serverCount).toBe(2);
    
    // Clean up
    await adapter.cleanup();
    
    // Verify adapter is not initialized
    expect(adapter.isInitialized()).toBe(false);
    
    // Check that servers are stopped via adapter status
    const afterStatus = await adapter.getStatus();
    expect(afterStatus.details.serverCount).toBe(0);
  });
  
  test('MCPManagerAdapter handles disabled servers correctly', async () => {
    
    // Create a config with disabled servers
    const disabledConfig = {
      'enabled-server': configs.filesystem,
      'disabled-server': {
        ...configs.filesystem,
        disabled: true
      }
    };
    
    // Create adapter
    adapter = new MCPManagerAdapter(
      mcpManager,
      disabledConfig,
      'disabled-test'
    );
    
    // Initialize the adapter
    await adapter.init();
    
    // Get adapter status
    const status = await adapter.getStatus();
    
    // Verify only the enabled server is running
    expect(status.details.serverCount).toBe(1);
    expect(status.details.servers).toHaveProperty('enabled-server');
    expect(status.details.servers).not.toHaveProperty('disabled-server');
    expect(status.details.servers['enabled-server'].running).toBe(true);
  });
  
  test('MCPManagerAdapter status correctly reflects server health', async () => {
    
    // Create adapter with filesystem server
    adapter = new MCPManagerAdapter(
      mcpManager,
      { 'status-test-server': configs.filesystem },
      'status-test'
    );
    
    // Check status before initialization
    const beforeStatus = await adapter.getStatus();
    expect(beforeStatus.isHealthy).toBe(false);
    expect(beforeStatus.statusCode).toBe(503);
    expect(beforeStatus.message).toBe('MCP Manager not initialized');
    
    // Initialize the adapter
    await adapter.init();
    
    // Check status after initialization
    const afterStatus = await adapter.getStatus();
    
    // Verify the server is properly initialized and running
    expect(afterStatus.details.initialized).toBe(true);
    expect(afterStatus.details.serverCount).toBe(1);
    expect(afterStatus.details.servers).toHaveProperty('status-test-server');
    expect(afterStatus.details.servers['status-test-server'].running).toBe(true);
  });
  
  test('MCPManagerAdapter handles initialization errors gracefully', async () => {
    // Create a config with an invalid server
    const invalidConfig = {
      'invalid-server': {
        command: 'non-existent-command',
        args: [],
        retries: 1, // Set fewer retries to speed up the test
        retryDelayMs: 100 // Short delay
      }
    };
    
    // Create adapter
    adapter = new MCPManagerAdapter(
      mcpManager,
      invalidConfig,
      'error-test'
    );
    
    try {
      // Initialize the adapter - should handle errors
      await adapter.init();
      
      // Adapter should still be marked as initialized
      expect(adapter.isInitialized()).toBe(true);
      
      // Get status - should either indicate unhealthy state or have no healthy servers
      const status = await adapter.getStatus();
      
      // Either we have no servers running, or the server is running but not healthy
      if (status.details.serverCount > 0) {
        // If the server somehow started, verify it's not healthy
        const firstServer = Object.values(status.details.servers)[0];
        if (firstServer.running) {
          expect(firstServer.healthy).toBe(false);
        }
      } else {
        expect(status.details.serverCount).toBe(0);
      }
    } catch (error) {
      // Even if we get an error, the test passes since we're testing error handling
      console.log('Expected error when trying to start invalid server:', error);
      expect(adapter.isInitialized()).toBe(false);
    }
  }, 8000); // Increase timeout to 8 seconds
});