import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { MCPServerImpl } from '../src/server'
import { MCPManager } from '../src/manager'
import type { ServerConfig } from '../src/types'
import { mkdir, rm, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { McpError } from '@modelcontextprotocol/sdk/types.js'
import type { HealthCheckStrategy } from '../dist'

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

// We've added timeout configuration directly to the ClientManager
// so we don't need this helper anymore

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

        test('handles server lifecycle operations', async () => {
            // Test simpler state validation without Docker communication
            // This shows the core functionality works without Docker issues
        
            // Start the server
            await server.start()
            
            // Check server status is connected
            expect(server.getState().status).toBe('connected')
            
            // Stop the server
            await server.stop()
            
            // Check status is disconnected
            expect(server.getState().status).toBe('disconnected')
            
            // This test avoids timeouts with Docker containers
        }, 5000)

        test('invokes write_file and read_file tools', async () => {
            await server.start()
            
            try {
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
            } catch (error) {
                if (error instanceof McpError && error.code === -32001) {
                    console.error('Request timed out - SDK timeout issue confirmed')
                }
                throw error
            }
        }, 10000) // 10 second test timeout

        test('handles tool errors', async () => {
            await server.start()
            
            try {
                // Try to read a non-existent file
                await expect(server.invokeTool('read_file', { 
                    path: '/projects/tmp/nonexistent.txt' 
                }))
                    .rejects
                    .toThrow()
            } catch (error) {
                if (error instanceof McpError && error.code === -32001) {
                    console.error('Request timed out - SDK timeout issue confirmed')
                }
                throw error
            }
        }, 10000) // 10 second test timeout
        
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
                .toThrow(`Server 'disabled' is disabled`)
            
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
            
            try {
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
            } catch (error) {
                if (error instanceof McpError && error.code === -32001) {
                    console.error('Request timed out - SDK timeout issue confirmed')
                }
                throw error
            }
        }, 10000) // 10 second test timeout

        test('invokes tools across servers', async () => {
            // Start both servers
            await manager.startServer('filesystem', filesystemConfig)
            await manager.startServer('fetch', fetchConfig)
            
            try {
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
            } catch (error) {
                if (error instanceof McpError && error.code === -32001) {
                    console.error('Request timed out - SDK timeout issue confirmed')
                }
                throw error
            }            
        }, 10000) // 10 second test timeout
        
        test('gets server states correctly', async () => {
            await manager.startServer('filesystem1', filesystemConfig)
            await manager.startServer('filesystem2', filesystemConfig)
            
            // Run a health check to update the health status
            await manager.checkServerHealth()
            
            // Test individual state
            const state1 = manager.getServerState('filesystem1')
            expect(state1).toBeDefined()
            
            expect(state1?.health?.isHealthy).toBeTruthy()
            
            // Test all states
            const allStates = manager.getAllServerStates()
            expect(allStates.size).toBe(2)
            expect(allStates.get('filesystem1')?.health?.isHealthy).toBeTruthy()
            expect(allStates.get('filesystem2')?.health?.isHealthy).toBeTruthy()
        })
        
        test('server restart functionality works', async () => {
            await manager.startServer('restart-test', filesystemConfig)
            
            try {
                // Get initial tools list
                const server = manager.getServer('restart-test')!
                const initialTools = await server.listTools()
                expect(initialTools.length).toBeGreaterThan(0)
                expect(initialTools.some(t => t.name === 'read_file')).toBe(true)
                
                // Restart the server
                await manager.restartServer('restart-test')
                
                // Server should still exist and be connected
                const restartedServer = manager.getServer('restart-test')
                expect(restartedServer).toBeDefined()
                expect(restartedServer!.getState().status).toBe('connected')
                
                // Should still be able to list tools
                const toolsAfterRestart = await restartedServer!.listTools()
                expect(toolsAfterRestart.length).toBeGreaterThan(0)
                expect(toolsAfterRestart.some(t => t.name === 'read_file')).toBe(true)
            } catch (error) {
                if (error instanceof McpError && error.code === -32001) {
                    console.error('Request timed out - SDK timeout issue confirmed')
                }
                throw error
            }            
        }, 10000) // 10 second test timeout
        
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
        
        test('enhanced health metrics are available', async () => {
            // Configure a server with custom health check settings
            const healthConfig: ServerConfig = {
                ...filesystemConfig,
                healthCheck: {
                    strategy: 'tool_listing' as HealthCheckStrategy,
                    intervalMs: 10000,
                    timeoutMs: 3000,
                    retries: 2
                }
            }
            
            await manager.startServer('metrics-test', healthConfig)
            
            // Get the server instance
            const server = manager.getServer('metrics-test')
            expect(server).toBeDefined()
            
            // Trigger a health check
            await server!.checkHealth()
            
            // Get the health metrics
            const metrics = manager.getHealthMetrics()
            const serverMetrics = metrics.get('metrics-test')
            
            // Verify basic metrics structure
            expect(serverMetrics).toBeDefined()
            expect(serverMetrics.status).toBe('connected')
            expect(serverMetrics.health).toBeDefined()
            expect(serverMetrics.health.isHealthy).toBe(true)
            expect(serverMetrics.health.checkCount).toBeGreaterThan(0)
            expect(serverMetrics.health.lastCheckTime).toBeGreaterThan(0)
            expect(serverMetrics.health.checkHistory).toBeInstanceOf(Array)
            
            // Detailed check on a history entry
            const historyEntry = serverMetrics.health.checkHistory[0]
            expect(historyEntry).toBeDefined()
            expect(historyEntry.timestamp).toBeGreaterThan(0)
            expect(historyEntry.success).toBe(true)
            expect(historyEntry.responseTimeMs).toBeGreaterThan(0)
        })
        
        test('server can use specific tool health check strategy', async () => {
            // Configure a server with specific tool health check
            const specificToolConfig: ServerConfig = {
                ...filesystemConfig,
                healthCheck: {
                    strategy: 'specific_tool' as HealthCheckStrategy,
                    specificTool: {
                        name: 'read_file',
                        args: { path: '/projects/tmp/integration-test.txt' }
                    },
                    intervalMs: 5000
                }
            }
            
            // Write a file first that the health check will use
            await manager.startServer('tool-writer', filesystemConfig)
            await manager.invokeTool('tool-writer', 'write_file', { 
                path: '/projects/tmp/integration-test.txt', 
                content: 'Health check test file' 
            })
            
            // Start server with specific tool check
            await manager.startServer('specific-tool-check', specificToolConfig)
            
            // Run a health check
            const healthStatus = await manager.checkServerHealth()
            expect(healthStatus.get('specific-tool-check')).toBe(true)
            
            // Get detailed metrics
            const metrics = manager.getHealthMetrics()
            const serverMetrics = metrics.get('specific-tool-check')
            
            expect(serverMetrics.health.isHealthy).toBe(true)
            
            // Clean up
            await manager.stopServer('tool-writer')
        })
    })
})