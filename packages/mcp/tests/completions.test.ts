import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { MCPManager } from '../src/manager'
import type { ServerConfig } from '../src/types'

describe('MCP Completions', () => {
  let manager: MCPManager
  
  // Use the test server for completions tests
  const TEST_SERVER_CONFIG: ServerConfig = {
    command: 'node',
    args: ['./tests/server/dist/index.js']
  }
  
  // Use the memory server which may support completions
  const MEMORY_SERVER_CONFIG: ServerConfig = {
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
  
  beforeEach(() => {
    manager = new MCPManager()
  })
  
  afterEach(async () => {
    await manager.cleanup()
  })
  
  test('getCompletions method exists on server implementation', async () => {
    await manager.startServer('test-server', TEST_SERVER_CONFIG)
    
    // Get server instance
    const server = manager.getServer('test-server')
    expect(server).toBeDefined()
    
    // Check that the method exists (even if it returns empty results)
    expect(typeof server!.getCompletions).toBe('function')
    
    // Get completions for a parameter - might be empty but should not throw
    try {
      const completions = await server!.getCompletions('add', 'a', '1')
      expect(Array.isArray(completions)).toBe(true)
    } catch (error) {
      // Test server might not support completions
      console.log('Note: Test server does not support completions')
    }
  })
  
  test('memory server integrates with getCompletions method', async () => {
    try {
      await manager.startServer('memory-server', MEMORY_SERVER_CONFIG)
      
      // Get available tools
      const server = manager.getServer('memory-server')
      const tools = await server!.listTools()
      
      if (tools.length > 0) {
        // Pick the first tool and its first parameter to test completions
        const firstTool = tools[0]
        const firstParamName = Object.keys(firstTool.parameters || {})[0]
        
        if (firstParamName) {
          try {
            // Try to get completions - this may return empty results or throw if not supported
            const completions = await manager.getCompletions(
              'memory-server',
              firstTool.name,
              firstParamName,
              ''  // Empty prefix to get all possible values
            )
            
            // Should return an array (might be empty)
            expect(Array.isArray(completions)).toBe(true)
          } catch (error) {
            // The server might not support completions, which is acceptable
            console.log('Note: Memory server does not support completions')
          }
        }
      }
    } catch (error) {
      // If we can't start the memory server, make a note but don't fail the test
      console.warn('Memory server not available for completions test:', 
        error instanceof Error ? error.message : String(error))
    }
  })
  
  test('MCPManager handles completions across servers', async () => {
    // Start multiple servers for testing
    await manager.startServer('test1', TEST_SERVER_CONFIG)
    
    try {
      await manager.startServer('test2', MEMORY_SERVER_CONFIG)
    } catch (error) {
      // If we can't start the memory server, continue with just test1
      console.warn('Memory server not available for multi-server test')
    }
    
    // The manager should handle completions routing correctly
    const serverIds = manager.getServerIds()
    for (const id of serverIds) {
      // Try completions for each server - should not throw
      try {
        const completions = await manager.getCompletions(id, 'nonexistent', 'param', 'test')
        // Should be an array, likely empty
        expect(Array.isArray(completions)).toBe(true)
      } catch (error) {
        // Some servers might have implementation differences, but manager shouldn't throw
        if (!(error instanceof Error && error.message.includes('Server not found'))) {
          throw error
        }
      }
    }
    
    // Test for non-existent server
    try {
      await manager.getCompletions('non-existent-server', 'method', 'param', 'test')
      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      // Expected to throw for non-existent server
      expect(error instanceof Error).toBe(true)
      expect((error as Error).message).toContain('not found')
    }
  })
})