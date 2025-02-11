// packages/types/src/workspace/__tests__/core.test.ts
import { beforeAll, beforeEach, afterAll, afterEach, describe, it, expect, test } from 'bun:test'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { initMandrakeDir, validateWorkspaceName, listWorkspaces, createWorkspace, getWorkspacesDir, resetMandrakeDir } from '../core'
import { WorkspaceError } from '../types'
import { readFullWorkspaceConfig, getWorkspacePath } from '../files'
import { getDefaultConfig } from '../config'

let testDir: string

beforeEach(async () => {
    // Create unique temp directory with test-specific name
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), `mandrake-test-${Date.now()}-`))
    process.env.MANDRAKE_DIR = testDir
    resetMandrakeDir()
    // Important: We shouldn't initialize here - let each test do its own setup
    // Remove the initMandrakeDir() call from beforeEach
})

afterEach(async () => {
    // Clean up env and files
    delete process.env.MANDRAKE_DIR
    resetMandrakeDir()
    await fs.rm(testDir, { recursive: true, force: true })
})


describe('initMandrakeDir', () => {
    it('creates mandrake directory structure', async () => {
        await initMandrakeDir()

        const mandrakeExists = await fs.stat(path.join(testDir, '.mandrake'))
            .then(() => true)
            .catch(() => false)

        const workspacesExists = await fs.stat(path.join(testDir, '.mandrake', 'workspaces'))
            .then(() => true)
            .catch(() => false)

        expect(mandrakeExists).toBe(true)
        expect(workspacesExists).toBe(true)
    })
})

describe('validateWorkspaceName', () => {
    it('accepts valid workspace names', () => {
        expect(validateWorkspaceName('my-workspace')).toBe(true)
        expect(validateWorkspaceName('workspace_123')).toBe(true)
        expect(validateWorkspaceName('TestWorkspace')).toBe(true)
    })

    it('rejects invalid workspace names', () => {
        expect(validateWorkspaceName('my workspace')).toBe(false)
        expect(validateWorkspaceName('workspace!')).toBe(false)
        expect(validateWorkspaceName('workspace/')).toBe(false)
    })
})

describe('createWorkspace', () => {
    beforeEach(async () => {
        await initMandrakeDir()
    })

    it('creates a new workspace with valid name', async () => {
        const workspace = await createWorkspace('test-workspace', crypto.randomUUID(), 'Test Description')

        expect(workspace).toMatchObject({
            name: 'test-workspace',
            description: 'Test Description'
        })
        expect(workspace.id).toBeDefined()
        expect(workspace.created).toBeDefined()

        // Check directory structure
        const workspacePath = path.join(getWorkspacesDir(), 'test-workspace')
        const dirs = await fs.readdir(workspacePath)
        expect(dirs).toEqual(expect.arrayContaining(['config', 'context', 'src']))
    })

    it('rejects workspace with invalid name', async () => {
        await expect(createWorkspace('test workspace', crypto.randomUUID())).rejects.toThrow(WorkspaceError)
    })

    it('rejects duplicate workspace names', async () => {
        await createWorkspace('test-workspace', crypto.randomUUID())
        await expect(createWorkspace('test-workspace', crypto.randomUUID())).rejects.toThrow(WorkspaceError)
    })
})

describe('listWorkspaces', () => {
    // Each test should set up its own state
    it('handles empty workspaces directory', async () => {
        // Explicitly initialize empty state
        await initMandrakeDir()
        const workspaces = await listWorkspaces()
        expect(workspaces).toHaveLength(0)
    })

    it('lists created workspaces', async () => {
        // Generate unique IDs
        const id1 = crypto.randomUUID()
        const id2 = crypto.randomUUID()

        // Create workspaces and verify creation
        const workspace1 = await createWorkspace('workspace1', id1, 'First Workspace')
        const workspace2 = await createWorkspace('workspace2', id2, 'Second Workspace')

        // Verify the workspaces exist on disk
        const base = getWorkspacesDir()
        const ws1exists = await fs.stat(path.join(base, 'workspace1', 'workspace.json'))
            .then(() => true)
            .catch(() => false)
        const ws2exists = await fs.stat(path.join(base, 'workspace2', 'workspace.json'))
            .then(() => true)
            .catch(() => false)

        expect(ws1exists).toBe(true)
        expect(ws2exists).toBe(true)

        // List and verify workspaces
        const workspaces = await listWorkspaces()
        expect(workspaces).toHaveLength(2)
        expect(workspaces.map(w => w.name)).toContain('workspace1')
        expect(workspaces.map(w => w.name)).toContain('workspace2')
    })
})

describe('workspace creation and config', () => {
    beforeEach(async () => {
        await initMandrakeDir()
    })

    it('creates a workspace with all config files', async () => {
        const workspace = await createWorkspace('test-workspace', crypto.randomUUID(), 'Test Description')
        const workspacePath = path.join(getWorkspacesDir(), 'test-workspace')

        // Verify workspace.json
        const workspaceConfig = await fs.readFile(path.join(workspacePath, 'workspace.json'), 'utf8')
        const parsedWorkspace = JSON.parse(workspaceConfig)
        expect(parsedWorkspace).toMatchObject({
            name: 'test-workspace',
            description: 'Test Description'
        })

        // Verify all config files exist and are readable
        const configFiles = await fs.readdir(path.join(workspacePath, 'config'))
        expect(configFiles).toEqual(
            expect.arrayContaining([
                'tools.json',
                'models.json',
                'context.json',
                'system-prompt.md'
            ])
        )

        // Verify config content matches defaults
        const fullConfig = await readFullWorkspaceConfig('test-workspace')
        const defaultConfig = await getDefaultConfig('test-workspace')

        // Strip dynamic values (like timestamps) before comparing
        const cleanConfig = {
            ...fullConfig,
            tools: {
                tools: fullConfig.tools.tools.map(t => ({
                    ...t,
                    name: t.name.replace(/-\d+$/, '') // Remove timestamp
                }))
            }
        }
        const cleanDefault = {
            ...defaultConfig,
            tools: {
                tools: defaultConfig.tools.tools.map(t => ({
                    ...t,
                    name: t.name.replace(/-\d+$/, '') // Remove timestamp
                }))
            }
        }

        expect(cleanConfig).toEqual(cleanDefault)
    })

    it('maintains consistent path resolution', async () => {
        const workspace = await createWorkspace('test-workspace', crypto.randomUUID())

        // Test that getWorkspacesDir is consistent
        const workspacesDir1 = getWorkspacesDir()
        const workspacesDir2 = getWorkspacesDir()
        expect(workspacesDir1).toBe(workspacesDir2)
        expect(workspacesDir1).toBe(path.join(testDir, '.mandrake', 'workspaces'))

        // Test path resolution for config files
        const workspacePath = path.join(getWorkspacesDir(), 'test-workspace')
        const configPath = path.join(workspacePath, 'config')

        // Verify the paths don't have duplicate mandrake dirs
        expect(configPath).not.toContain('.mandrake/workspaces/.mandrake/workspaces')

        // Verify we can read/write config files
        const toolsPath = path.join(configPath, 'tools.json')
        expect(await fs.stat(toolsPath)).toBeTruthy()
    })

    it('handles errors correctly when reading non-existent configs', async () => {
        await createWorkspace('test-workspace', crypto.randomUUID())

        // Delete a config file
        const toolsPath = path.join(getWorkspacesDir(), 'test-workspace', 'config', 'tools.json')
        await fs.unlink(toolsPath)

        // Attempt to read full config should fail appropriately
        await expect(readFullWorkspaceConfig('test-workspace')).rejects.toThrow()
    })

    it('creates empty context files directory', async () => {
        await createWorkspace('test-workspace', crypto.randomUUID())

        const contextPath = path.join(getWorkspacesDir(), 'test-workspace', 'context', 'files')
        const stat = await fs.stat(contextPath)
        expect(stat.isDirectory()).toBe(true)

        const files = await fs.readdir(contextPath)
        expect(files).toHaveLength(0)
    })
})

describe('workspace management', () => {
    const testDir = path.join(os.tmpdir(), 'mandrake-test')

    beforeAll(async () => {
        // Set up test environment
        process.env.MANDRAKE_DIR = testDir
        resetMandrakeDir()
    })

    beforeEach(async () => {
        // Clean up before each test
        try {
            await fs.rm(testDir, { recursive: true, force: true })
        } catch (error) {
            // Ignore if directory doesn't exist
        }
    })

    afterAll(async () => {
        // Clean up after all tests
        await fs.rm(testDir, { recursive: true, force: true })
        delete process.env.MANDRAKE_DIR
        resetMandrakeDir()
    })

    test('creates workspace with correct structure', async () => {
        const workspace = await createWorkspace('test-workspace', 'test-id', 'Test Description')

        // Verify workspace metadata
        expect(workspace).toEqual({
            id: 'test-id',
            name: 'test-workspace',
            description: 'Test Description',
            created: expect.any(String)
        })

        // Get workspace paths
        const paths = getWorkspacePath('test-workspace')

        // Verify directory structure exists
        const dirs = [
            paths.root,
            paths.config,
            paths.contextFiles,
            paths.src
        ]

        for (const dir of dirs) {
            const stat = await fs.stat(dir)
            expect(stat.isDirectory()).toBe(true)
        }

        // Verify config files exist
        const files = [
            paths.workspace,
            paths.tools,
            paths.models,
            paths.context,
            paths.systemPrompt
        ]

        for (const file of files) {
            const stat = await fs.stat(file)
            expect(stat.isFile()).toBe(true)
        }

        // Verify workspace.json content
        const workspaceConfig = JSON.parse(
            await fs.readFile(paths.workspace, 'utf-8')
        )
        expect(workspaceConfig).toEqual(workspace)

        // Verify default configs
        const toolsConfig = JSON.parse(
            await fs.readFile(paths.tools, 'utf-8')
        )
        expect(toolsConfig.tools).toHaveLength(3)
        expect(toolsConfig.tools.map((t: { id: string }) => t.id)).toEqual(['filesystem', 'git', 'fetch'])

        const modelsConfig = JSON.parse(
            await fs.readFile(paths.models, 'utf-8')
        )
        expect(modelsConfig).toEqual({
            provider: '',
            baseURL: 'https://api.openai.com/v1/engines/davinci-codex/completions',
            maxTokens: 16000,
            temperature: 0.7
        })

        const contextConfig = JSON.parse(
            await fs.readFile(paths.context, 'utf-8')
        )
        expect(contextConfig).toEqual({
            refresh: {
                git: { enabled: true, interval: '1h' },
                filesystem: { enabled: true, onDemand: true }
            }
        })
    })

    test('prevents duplicate workspace names', async () => {
        await createWorkspace('test-workspace', 'test-id')
        await expect(
            createWorkspace('test-workspace', 'another-id')
        ).rejects.toThrow('Workspace already exists')
    })

    test('validates workspace names', async () => {
        const invalidNames = [
            'test workspace',
            'test/workspace',
            'test\\workspace',
            'test.workspace',
            'test@workspace'
        ]

        for (const name of invalidNames) {
            await expect(
                createWorkspace(name, 'test-id')
            ).rejects.toThrow('Invalid workspace name')
        }
    })
})
