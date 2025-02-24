import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test'
import { MCPManager } from '../src/manager'
import type { ServerConfig } from '../src/types'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

const TEST_DIR = join(process.cwd(), 'test/tmp')
const WORKSPACE_DIR = join(TEST_DIR, 'ws')

const SERVER_CONFIG: ServerConfig = {
    command: 'bun',
    args: [
        'run',
        join(process.cwd(), '../ripper/dist/server.js'),
        '--transport=stdio',
        `--workspaceDir=${WORKSPACE_DIR}`,
        '--excludePatterns=\\.ws'
    ]
}

describe('Ripper Server', () => {
    let manager: MCPManager

    beforeAll(async () => {
        await mkdir(WORKSPACE_DIR, { recursive: true })
        await mkdir(join(WORKSPACE_DIR, '.ws'), { recursive: true })
        await writeFile(join(WORKSPACE_DIR, 'normal.txt'), 'normal content')
        await writeFile(join(WORKSPACE_DIR, '.ws', 'hidden.txt'), 'hidden content')
    })

    afterAll(async () => {
        await rm(TEST_DIR, { recursive: true, force: true })
    })

    beforeEach(() => {
        manager = new MCPManager()
    })

    afterEach(async () => {
        await manager.cleanup()
    })

    test('starts ripper server', async () => {
        await manager.startServer('ripper', SERVER_CONFIG)
        const server = manager.getServer('ripper')
        expect(server).toBeDefined()

        const tools = await server!.listTools()
        expect(tools.length).toBeGreaterThan(0)
        // Update tool names to match actual names
        expect(tools.map(t => t.name)).toContain('read_files')
        expect(tools.map(t => t.name)).toContain('write_file')
    }, 30000)

    test('respects exclude patterns when listing directory', async () => {
        await manager.startServer('ripper', SERVER_CONFIG)

        const result = await manager.invokeTool('ripper', 'list_directory', {
            path: WORKSPACE_DIR,
            allowedDirs: [WORKSPACE_DIR] // Add this
        })
        const items = JSON.parse((result.content as any)[0].text).items
        expect(items.length).toBe(1)
        expect(items[0].name).toBe('normal.txt')
    })

    test('respects exclude patterns when reading files', async () => {
        await manager.startServer('ripper', SERVER_CONFIG)

        const result = await manager.invokeTool('ripper', 'read_files', {
            paths: [
                join(WORKSPACE_DIR, 'normal.txt'),
                join(WORKSPACE_DIR, '.ws', 'hidden.txt')
            ],
            allowedDirs: [WORKSPACE_DIR] // Add this
        })
        const files = JSON.parse((result.content as any)[0].text)

        expect(files[0].content).toBe('normal content')
        expect(files[0].error).toBeUndefined()

        expect(files[1].content).toBe('')
        expect(files[1].error).toBe('Path matches exclude pattern')
    })

    test('respects exclude patterns when reading files', async () => {
        await manager.startServer('ripper', SERVER_CONFIG)

        // Debug log paths
        const normalPath = join(WORKSPACE_DIR, 'normal.txt')

        const result = await manager.invokeTool('ripper', 'read_files', {
            paths: [normalPath],
            allowedDirs: [WORKSPACE_DIR]
        })

        const files = JSON.parse((result.content as any)[0].text)
        expect(files[0].content).toBe('normal content')
        expect(files[0].error).toBeUndefined()
    })

    test('tool-specific exclude patterns override defaults', async () => {
        await manager.startServer('ripper', SERVER_CONFIG)

        const hiddenPath = join(WORKSPACE_DIR, '.ws', 'hidden.txt')

        const result = await manager.invokeTool('ripper', 'read_files', {
            paths: [hiddenPath],
            excludePatterns: [], // Should override defaults
            allowedDirs: [WORKSPACE_DIR]
        })

        const files = JSON.parse((result.content as any)[0].text)
        expect(files[0].error).toContain('Path matches exclude pattern')
        expect(files[0].content).toBe('')
    })
})