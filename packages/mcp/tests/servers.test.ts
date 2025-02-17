import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test'
import { MCPManager } from '../src/manager'
import type { ServerConfig } from '../src/types'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const TEST_DIR = join(process.cwd(), 'test/tmp')
const GIT_REPO_DIR = join(TEST_DIR, 'repo')

// Docker image names
const IMAGES = {
    filesystem: 'mcp/filesystem',
    git: 'mcp/git',
    fetch: 'mcp/fetch'
}

const SERVER_CONFIGS: Record<string, ServerConfig> = {
    filesystem: {
        command: 'docker',
        args: [
            'run',
            '--rm',
            '-i',
            '--mount',
            `type=bind,src=${TEST_DIR},dst=/projects/tmp`,
            IMAGES.filesystem,
            '/projects'
        ]
    },
    fetch: {
        command: 'docker',
        args: [
            'run',
            '--rm',
            '-i',
            IMAGES.fetch
        ]
    },
    test: {
        command: 'node',
        args: ['./tests/server/dist/index.js']
    }
}

describe('MCP Servers', () => {
    let manager: MCPManager

    beforeAll(async () => {
        // Create test directories
        await mkdir(TEST_DIR, { recursive: true })
        await mkdir(GIT_REPO_DIR, { recursive: true })

        // Initialize test git repo
        execSync('git init', { cwd: GIT_REPO_DIR })
    })

    afterAll(async () => {
        // Clean up test directory
        await rm(TEST_DIR, { recursive: true, force: true })
    })

    beforeEach(() => {
        manager = new MCPManager()
    })

    afterEach(async () => {
        await manager.cleanup()
    })


    test('starts filesystem server', async () => {
        await manager.startServer('filesystem', SERVER_CONFIGS.filesystem)
        const server = manager.getServer('filesystem')
        expect(server).toBeDefined()
    })

    test('filesystem server can write and read files', async () => {
        await manager.startServer('filesystem', SERVER_CONFIGS.filesystem)

        await manager.invokeTool('filesystem', 'write_file', {
            path: '/projects/tmp/test.txt',
            content: 'Hello, World!'
        })

        const result = await manager.invokeTool('filesystem', 'read_file', {
            path: '/projects/tmp/test.txt'
        })
        expect((result.content as any)[0].text).toBe('Hello, World!')
    })

    test('starts fetch server and lists tools', async () => {
        await manager.startServer('fetch', SERVER_CONFIGS.fetch)
        const server = manager.getServer('fetch')
        expect(server).toBeDefined()

        const tools = await server!.listTools()
        expect(tools.length).toBeGreaterThan(0)
        expect(tools.map(t => t.name)).toContain('fetch')
    })

    test('fetch server can retrieve web content', async () => {
        await manager.startServer('fetch', SERVER_CONFIGS.fetch)

        const result = await manager.invokeTool('fetch', 'fetch', {
            url: 'http://example.com',
            max_length: 1000
        })
        expect((result.content as any)[0].text).toContain('Example Domain')
    })

    test('can run all servers simultaneously', async () => {
        // Start servers one by one and verify
        for (const [id, config] of Object.entries(SERVER_CONFIGS)) {
            await manager.startServer(id, config)
            const server = manager.getServer(id)
            expect(server).toBeDefined()

            const tools = await server!.listTools()
            expect(tools.length).toBeGreaterThan(0)
        }

        // Verify total tool count
        const allTools = await manager.listAllTools()
        expect(allTools.length).toBeGreaterThan(0)
    })

    test('handles server errors gracefully', async () => {
        await manager.startServer('filesystem', SERVER_CONFIGS.filesystem)

        await expect(
            manager.invokeTool('filesystem', 'read_file', {
                path: '/projects/tmp/nonexistent.txt'
            })
        ).rejects.toThrow()
    })

    test('captures error logs in buffer', async () => {
        await manager.startServer('filesystem', SERVER_CONFIGS.filesystem)
        const server = manager.getServer('filesystem')
        expect(server).toBeDefined()

        // Trigger an error
        await expect(
            server!.invokeTool('read_file', { path: '/nonexistent' })
        ).rejects.toThrow()

        // Verify error is captured
        const state = server!.getState()
        expect(state.logs).toBeDefined()
        expect(state.logs.length).toBeGreaterThan(0)
        expect(state.logs[0]).toContain('Error')
    })
})