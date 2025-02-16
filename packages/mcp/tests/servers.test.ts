import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { MCPServerImpl } from '../src/server'
import { MCPManager } from '../src/manager'
import type { ServerConfig } from '../src/types'

// Standard server configs
const SERVERS = {
    filesystem: {
        name: 'filesystem',
        command: 'mcp-fs',
        args: ['--path', '.']
    },
    git: {
        name: 'git',
        command: 'mcp-git',
        env: { GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@test.com' }
    },
    fetch: {
        name: 'fetch',
        command: 'mcp-fetch'
    },
    test: {
        name: 'test',
        command: 'node',
        args: ['./tests/server/dist/index.js']
    }
} as const

describe('MCP Servers', () => {
    let manager: MCPManager

    beforeEach(() => {
        manager = new MCPManager()
    })

    afterEach(async () => {
        await manager.cleanup()
    })

    describe('Filesystem Server', () => {
        test('reads and writes files', async () => {
            await manager.startServer(SERVERS.filesystem)
            
            // Write test file
            await manager.invokeTool('filesystem', 'writeFile', {
                path: 'test.txt',
                content: 'hello world'
            })

            // Read test file
            const result = await manager.invokeTool('filesystem', 'readFile', {
                path: 'test.txt'
            })
            expect((result.content as any)[0].text).toBe('hello world')

            // List directory
            const dirResult = await manager.invokeTool('filesystem', 'listFiles', {
                path: '.'
            })
            expect((dirResult.content as any)[0].text).toContain('test.txt')
        })

        test('handles missing files', async () => {
            await manager.startServer(SERVERS.filesystem)
            
            await expect(manager.invokeTool('filesystem', 'readFile', {
                path: 'nonexistent.txt'
            })).rejects.toThrow()
        })
    })

    describe('Git Server', () => {
        test('performs basic git operations', async () => {
            await manager.startServer(SERVERS.git)

            // Check git status
            const statusResult = await manager.invokeTool('git', 'status', {})
            expect(statusResult.content[0].text).toBeDefined()

            // Write and commit a file
            await manager.startServer(SERVERS.filesystem)
            await manager.invokeTool('filesystem', 'writeFile', {
                path: 'test.txt',
                content: 'hello git'
            })

            // Add and commit
            await manager.invokeTool('git', 'add', { path: 'test.txt' })
            const commitResult = await manager.invokeTool('git', 'commit', {
                message: 'test commit'
            })
            expect(commitResult.content[0].text).toContain('test commit')
        })
    })

    describe('Fetch Server', () => {
        test('fetches content', async () => {
            await manager.startServer(SERVERS.fetch)

            const result = await manager.invokeTool('fetch', 'fetch', {
                url: 'https://example.com'
            })
            expect(result.content[0].text).toContain('Example Domain')
        })

        test('handles fetch errors', async () => {
            await manager.startServer(SERVERS.fetch)

            await expect(manager.invokeTool('fetch', 'fetch', {
                url: 'https://nonexistent.example.com'
            })).rejects.toThrow()
        })
    })

    describe('Multi-Server Operations', () => {
        test('runs all servers concurrently', async () => {
            // Start all servers
            await Promise.all(Object.values(SERVERS).map(config => 
                manager.startServer(config)
            ))

            const tools = await manager.listAllTools()
            expect(tools.length).toBeGreaterThan(5) // Should have multiple tools from each server
        })

        test('git and filesystem interaction', async () => {
            await manager.startServer(SERVERS.filesystem)
            await manager.startServer(SERVERS.git)

            // Write file
            await manager.invokeTool('filesystem', 'writeFile', {
                path: 'test.txt',
                content: 'hello git'
            })

            // Commit file
            await manager.invokeTool('git', 'add', { path: 'test.txt' })
            const commitResult = await manager.invokeTool('git', 'commit', {
                message: 'test commit'
            })

            // Verify commit
            const logResult = await manager.invokeTool('git', 'log', {
                maxCount: 1
            })
            expect((logResult.content as any)[0].text).toContain('test commit')
        })
    })

    describe('Multiple Managers', () => {
        test('shares servers between managers', async () => {
            const manager2 = new MCPManager()

            try {
                // Start servers in both managers
                await Promise.all([
                    manager.startServer(SERVERS.filesystem),
                    manager2.startServer(SERVERS.filesystem)
                ])

                // Write with manager1
                await manager.invokeTool('filesystem', 'writeFile', {
                    path: 'test.txt',
                    content: 'hello'
                })

                // Read with manager2
                const result = await manager2.invokeTool('filesystem', 'readFile', {
                    path: 'test.txt'
                })
                expect((result.content as any)[0].text).toBe('hello')

            } finally {
                await manager2.cleanup()
            }
        })
    })

    describe('Lifecycle', () => {
        test('handles server restart', async () => {
            await manager.startServer(SERVERS.filesystem)
            
            // Initial write
            await manager.invokeTool('filesystem', 'writeFile', {
                path: 'test.txt',
                content: 'hello'
            })

            // Stop and restart
            await manager.stopServer('filesystem')
            await manager.startServer(SERVERS.filesystem)

            // Verify still works
            const result = await manager.invokeTool('filesystem', 'readFile', {
                path: 'test.txt'
            })
            expect(result.content[0].text).toBe('hello')
        })

        test('cleanup stops all servers', async () => {
            // Start all servers
            await Promise.all(Object.values(SERVERS).map(config => 
                manager.startServer(config)
            ))

            // Cleanup
            await manager.cleanup()

            // Verify all stopped
            Object.keys(SERVERS).forEach(name => {
                expect(manager.getServer(name)).toBeUndefined()
            })
        })
    })
})
