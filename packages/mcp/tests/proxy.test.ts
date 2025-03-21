import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { MCPProxy } from '../src/proxy'
import { MCPServerImpl } from '../src/server'
import { MCPManager } from '../src/manager'
import type { ServerConfig } from '../src/types'
import { mkdir, rm, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

interface TestDirectory {
    path: string;
    cleanup: () => Promise<void>;
}

async function createTestDirectory(prefix: string = 'mandrake-mcp-test-'): Promise<TestDirectory> {
    const path = await mkdtemp(join(tmpdir(), prefix));
    return {
        path,
        cleanup: async () => {
            await rm(path, { recursive: true, force: true });
        }
    };
}

describe('MCPProxy Integration Tests', () => {
  // We'll test the proxy functionality through the MCPServerImpl
  // since it's integrated there and works with real servers
  
  let testDir: TestDirectory;
  let filesystemConfig: ServerConfig;
  let fetchConfig: ServerConfig;
  let manager: MCPManager;
  
  beforeAll(async () => {
    // Create test directory
    testDir = await createTestDirectory();
    // Create subdirectories
    await mkdir(join(testDir.path, 'proxy-tests'), { recursive: true });
    
    // Set up filesystem config with the test directory
    filesystemConfig = {
        command: 'docker',
        args: [
            'run',
            '--rm',
            '-i',
            '--mount',
            `type=bind,src=${testDir.path},dst=/projects/tmp`,
            'mcp/filesystem',
            '/projects'
        ]
    };
    
    // Fetch server config
    fetchConfig = {
        command: 'docker',
        args: [
            'run',
            '--rm',
            '-i',
            'mcp/fetch'
        ]
    };
  });
  
  afterAll(async () => {
    // Clean up test directory
    await testDir.cleanup();
  });
  
  beforeEach(() => {
    manager = new MCPManager()
  })
  
  afterEach(async () => {
    await manager.cleanup()
  })
  
  test('server connects and disconnects properly', async () => {
    // Start server
    try {
      await manager.startServer('test-server', filesystemConfig)
      const server = manager.getServer('test-server')
      expect(server).toBeDefined()
      
      // Check server state
      const state = server!.getState()
      expect(state.status).toBe('connected')
    } catch (error) {
      console.error('Error starting server:', error)
      throw error
    }
    
    // Stop server and check state is cleaned up
    await manager.stopServer('test-server')
    
    // Server should be removed from manager
    expect(manager.getServer('test-server')).toBeUndefined()
  })
  
  test('tools work with proxy transport', async () => {
    // Start server
    await manager.startServer('test-server', filesystemConfig)
    
    // List tools - this verifies the proxy is forwarding messages
    const tools = await manager.getServer('test-server')!.listTools()
    expect(tools.length).toBeGreaterThan(0)
    expect(tools.map(t => t.name)).toContain('read_file')
    
    // Test tool invocation - this verifies the proxy forwards request and response
    // First write a file
    await manager.invokeTool('test-server', 'write_file', { 
      path: '/projects/tmp/proxy-test.txt', 
      content: 'Hello from proxy test'
    })
    
    // Then read it back
    const result = await manager.invokeTool('test-server', 'read_file', { 
      path: '/projects/tmp/proxy-test.txt'
    })
    expect((result.content as any)[0].text).toBe('Hello from proxy test')
    
    // Verify error propagation through proxy by reading non-existent file
    await expect(
      manager.invokeTool('test-server', 'read_file', { 
        path: '/projects/tmp/nonexistent.txt'
      })
    ).rejects.toThrow()
    
    // Clean up
    await manager.stopServer('test-server')
  })
  
  test('handles server errors gracefully', async () => {
    // Create a disabled server to test error handling
    const disabledConfig: ServerConfig = {
      ...filesystemConfig,
      disabled: true
    }
    
    // This should not throw but create a disabled server
    await manager.startServer('disabled-server', disabledConfig)
    
    // Server should exist in manager but be disabled
    const server = manager.getServer('disabled-server')
    expect(server).toBeDefined()
    expect(server!.getState().status).toBe('disabled')
    
    // Trying to invoke a tool on a disabled server should throw
    await expect(
      manager.invokeTool('disabled-server', 'read_file', { 
        path: '/projects/tmp/doesnt-matter.txt'
      })
    ).rejects.toThrow(`Server 'disabled-server' is disabled`)
  })
  
  test('multiple servers can run concurrently', async () => {
    // Start multiple filesystem servers
    await manager.startServer('fs1', filesystemConfig)
    await manager.startServer('fs2', filesystemConfig)
    
    // Verify servers are running
    const serverIds = manager.getServerIds()
    expect(serverIds.length).toBe(2)
    
    // Get all tools from all servers
    const allTools = await manager.listAllTools()
    expect(allTools.length).toBeGreaterThan(0)
    
    // Verify each server has its own set of tools
    const toolsByServer = allTools.reduce((acc, tool) => {
      acc[tool.server] = (acc[tool.server] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Each server should have at least one tool
    for (const id of serverIds) {
      expect(toolsByServer[id]).toBeGreaterThan(0)
    }
    
    // Write to the first filesystem
    await manager.invokeTool('fs1', 'write_file', { 
      path: '/projects/tmp/multi-server-1.txt', 
      content: 'Written by fs1'
    })
    
    // Write to the second filesystem
    await manager.invokeTool('fs2', 'write_file', { 
      path: '/projects/tmp/multi-server-2.txt', 
      content: 'Written by fs2'
    })
    
    // Read from both to verify
    const result1 = await manager.invokeTool('fs1', 'read_file', { 
      path: '/projects/tmp/multi-server-1.txt'
    })
    expect((result1.content as any)[0].text).toBe('Written by fs1')
    
    const result2 = await manager.invokeTool('fs2', 'read_file', { 
      path: '/projects/tmp/multi-server-2.txt'
    })
    expect((result2.content as any)[0].text).toBe('Written by fs2')
  })
  
  test('works with real external servers', async () => {
    // Start fetch server
    await manager.startServer('fetch', fetchConfig)
    
    // Get server instance
    const server = manager.getServer('fetch')
    expect(server).toBeDefined()
    
    // Should be connected
    expect(server!.getState().status).toBe('connected')
    
    // List tools to verify proxy is working
    const tools = await server!.listTools()
    expect(tools.length).toBeGreaterThan(0)
    expect(tools.some(t => t.name === 'fetch')).toBe(true)
    
    // Try a fetch operation
    const result = await manager.invokeTool('fetch', 'fetch', {
      url: 'http://example.com',
      max_length: 1000
    })
    
    // Should get some HTML back
    expect((result.content as any)[0].text).toContain('Example Domain')
  })
})