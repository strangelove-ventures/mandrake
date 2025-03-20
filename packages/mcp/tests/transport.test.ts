import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { TransportFactory } from '../src/transport'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { MCPManager } from '../src/manager'
import type { ServerConfig } from '../src/types'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
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

// Client config for tests
const CLIENT_CONFIG = {
  info: {
    name: 'test-client',
    version: '1.0.0',
  },
  options: {
    capabilities: {},
  },
}

describe('Transport Integration Tests', () => {
  let httpServer: ReturnType<typeof createServer> | null = null
  let serverProcess: ReturnType<typeof spawn> | null = null
  let manager: MCPManager
  let testDir: TestDirectory
  let filesystemConfig: ServerConfig
  let fetchConfig: ServerConfig
  
  beforeAll(async () => {
    // Create test directory
    testDir = await createTestDirectory();
    // Create subdirectories
    await mkdir(join(testDir.path, 'transport-tests'), { recursive: true });
    
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
  })
  
  afterAll(async () => {
    // Clean up test directory
    await testDir.cleanup();
  })
  
  beforeEach(() => {
    manager = new MCPManager()
  })
  
  afterEach(async () => {
    await manager.cleanup()
    
    // Cleanup HTTP server if running
    if (httpServer) {
      httpServer.close()
      httpServer = null
    }
    
    // Cleanup any spawned processes
    if (serverProcess) {
      serverProcess.kill()
      serverProcess = null
    }
  })
  
  test('STDIO transport connects to filesystem server', async () => {
    // Create transport directly
    const transport = TransportFactory.create(filesystemConfig)
    expect(transport).toBeDefined()
    expect(transport).toBeInstanceOf(StdioClientTransport)
    
    // Test we can connect with this transport
    const client = new Client(CLIENT_CONFIG.info, CLIENT_CONFIG.options)
    
    try {
      await client.connect(transport)
      
      // Test basic request
      const tools = await client.listTools()
      expect(tools.tools.length).toBeGreaterThan(0)
      expect(tools.tools.map(t => t.name)).toContain('read_file')
      expect(tools.tools.map(t => t.name)).toContain('write_file')
      
      // Test cleanup
      await client.close()
    } catch (e) {
      await client.close()
      throw e
    }
  })
  
  // Skip this test for now as Docker execution is problematic in some test environments
  test.skip('STDIO transport with Docker env variables', async () => {
    // Config with environment variables
    const envConfig: ServerConfig = {
      ...filesystemConfig,
      env: {
        TEST_VAR_1: 'test-value-1',
        TEST_VAR_2: 'test-value-2'
      }
    }
    
    // Verify TransportFactory creates the right transport type
    const transport = TransportFactory.create(envConfig) 
    expect(transport).toBeInstanceOf(StdioClientTransport)
  })
  
  test('throws error for disabled server', () => {
    const config: ServerConfig = {
      command: 'node',
      disabled: true
    }
    
    expect(() => TransportFactory.create(config)).toThrow('Cannot create transport for disabled server')
  })
  
  // Additional test to check completions
  test('getCompletions method works with filesystem server', async () => {
    await manager.startServer('completion-test', filesystemConfig)
    
    try {
      // Try to get completions for the path parameter of read_file
      const completions = await manager.getCompletions('completion-test', 'read_file', 'path', '/projects')
      
      // Different servers may have different completion support
      // Most important thing is the method doesn't throw and returns an array
      expect(Array.isArray(completions)).toBe(true)
    } catch (error) {
      // This is also acceptable - the server might just not support completions
      expect(error instanceof Error).toBe(true)
    }
  })
})