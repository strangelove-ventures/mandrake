import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
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

describe('MCP Integration', () => {
    let testDir: TestDirectory;
    let filesystemConfig: ServerConfig;
    
    beforeAll(async () => {
        // Create test directory
        testDir = await createTestDirectory();
        // Create subdirectories
        await mkdir(join(testDir.path, 'integration-tests'), { recursive: true });
        
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
    });
    
    afterAll(async () => {
        // Clean up test directory
        await testDir.cleanup();
    });
    
    // Fetch server config
    const fetchConfig: ServerConfig = {
        command: 'docker',
        args: [
            'run',
            '--rm',
            '-i',
            'mcp/fetch'
        ]
    };

    describe('MCPServerImpl', () => {
        let server: MCPServerImpl

        beforeEach(() => {
            server = new MCPServerImpl("test", filesystemConfig)
        })

        afterEach(async () => {
            await server.stop()
        })

        test('starts and lists tools', async () => {
            await server.start()
            const tools = await server.listTools()
            
            // Filesystem server has more than 0 tools
            expect(tools.length).toBeGreaterThan(0)
            // Should have read_file and write_file tools
            expect(tools.map(t => t.name)).toContain('read_file')
            expect(tools.map(t => t.name)).toContain('write_file')
        })

        test('invokes write_file and read_file tools', async () => {
            await server.start()
            
            // Write to a file
            await server.invokeTool('write_file', { 
                path: '/projects/tmp/integration-test.txt', 
                content: 'Hello from integration test' 
            })
            
            // Read from the file
            const result = await server.invokeTool('read_file', { 
                path: '/projects/tmp/integration-test.txt' 
            })
            expect((result.content as any)[0].text).toBe('Hello from integration test')
        })

        test('handles tool errors', async () => {
            await server.start()
            // Try to read a non-existent file
            await expect(server.invokeTool('read_file', { 
                path: '/projects/tmp/nonexistent.txt' 
            }))
                .rejects
                .toThrow()
        })
        
        test('reports correct status', async () => {
            // Before starting
            expect(server.getState().status).toBe('disconnected')
            
            // After starting
            await server.start()
            expect(server.getState().status).toBe('connected')
            
            // After stopping
            await server.stop()
            expect(server.getState().status).toBe('disconnected')
        })
        
        test('handles disabled servers correctly', async () => {
            const disabledConfig: ServerConfig = {
                ...filesystemConfig,
                disabled: true
            }
            
            const disabledServer = new MCPServerImpl("disabled", disabledConfig)
            await disabledServer.start() // This should not throw
            
            expect(disabledServer.getState().status).toBe('disabled')
            expect(await disabledServer.listTools()).toHaveLength(0)
            
            await expect(disabledServer.invokeTool('read_file', { 
                path: '/projects/tmp/integration-test.txt' 
            }))
                .rejects
                .toThrow('Server is disabled')
            
            await disabledServer.stop() // Should clean up properly
        })
    })

    describe('MCPManager', () => {
        let manager: MCPManager

        beforeEach(() => {
            manager = new MCPManager()
        })

        afterEach(async () => {
            await manager.cleanup()
        })

        test('starts multiple servers', async () => {
            await manager.startServer('filesystem', filesystemConfig)
            await manager.startServer('fetch', fetchConfig)

            const tools = await manager.listAllTools()
            expect(tools.length).toBeGreaterThan(0) // Both servers should have tools
            
            // Check tools from different servers
            const filesystemTools = tools.filter(t => t.server === 'filesystem')
            const fetchTools = tools.filter(t => t.server === 'fetch')
            
            expect(filesystemTools.length).toBeGreaterThan(0)
            expect(fetchTools.length).toBeGreaterThan(0)
            
            // Filesystem should have read_file
            expect(filesystemTools.some(t => t.name === 'read_file')).toBe(true)
            
            // Fetch should have fetch
            expect(fetchTools.some(t => t.name === 'fetch')).toBe(true)
        })

        test('invokes tools across servers', async () => {
            // Start both servers
            await manager.startServer('filesystem', filesystemConfig)
            await manager.startServer('fetch', fetchConfig)
            
            // Write a file using filesystem server
            await manager.invokeTool('filesystem', 'write_file', { 
                path: '/projects/tmp/integration-multi.txt', 
                content: 'Written by manager test' 
            })
            
            // Read it back to verify
            const readResult = await manager.invokeTool('filesystem', 'read_file', { 
                path: '/projects/tmp/integration-multi.txt' 
            })
            expect((readResult.content as any)[0].text).toBe('Written by manager test')
            
            // Use the fetch server
            const fetchResult = await manager.invokeTool('fetch', 'fetch', {
                url: 'http://example.com',
                max_length: 500
            })
            expect((fetchResult.content as any)[0].text).toContain('Example Domain')
        })
        
        test('gets server states correctly', async () => {
            await manager.startServer('filesystem1', filesystemConfig)
            await manager.startServer('filesystem2', filesystemConfig)
            
            // Test individual state
            const state1 = manager.getServerState('filesystem1')
            expect(state1).toBeDefined()
            expect(state1?.status).toBe('connected')
            
            // Test all states
            const allStates = manager.getAllServerStates()
            expect(allStates.size).toBe(2)
            expect(allStates.get('filesystem1')?.status).toBe('connected')
            expect(allStates.get('filesystem2')?.status).toBe('connected')
        })
        
        test('server restart functionality works', async () => {
            await manager.startServer('restart-test', filesystemConfig)
            
            // Get initial tools list
            const initialTools = await manager.getServer('restart-test')!.listTools()
            expect(initialTools.length).toBeGreaterThan(0)
            expect(initialTools.some(t => t.name === 'read_file')).toBe(true)
            
            // Restart the server
            await manager.restartServer('restart-test')
            
            // Server should still exist and be connected
            const server = manager.getServer('restart-test')
            expect(server).toBeDefined()
            expect(server!.getState().status).toBe('connected')
            
            // Should still be able to list tools
            const toolsAfterRestart = await server!.listTools()
            expect(toolsAfterRestart.length).toBeGreaterThan(0)
            expect(toolsAfterRestart.some(t => t.name === 'read_file')).toBe(true)
        })
        
        test('server health checking works', async () => {
            await manager.startServer('health1', filesystemConfig)
            
            // Directly check health
            const healthStatus = await manager.checkServerHealth()
            expect(healthStatus.get('health1')).toBe(true)
            
            // Create a disabled server instead of a failing one
            // This avoids the long timeout retry logic
            const disabledConfig: ServerConfig = {
                ...filesystemConfig,
                disabled: true
            }
            
            await manager.startServer('disabled-server', disabledConfig)
            
            // Check health again
            const updatedHealth = await manager.checkServerHealth()
            expect(updatedHealth.get('health1')).toBe(true)
            expect(updatedHealth.get('disabled-server')).toBe(false) // Disabled servers are considered unhealthy
        })
    })
})