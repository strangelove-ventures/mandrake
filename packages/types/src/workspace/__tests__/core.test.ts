// packages/types/src/workspace/__tests__/core.test.ts
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { initMandrakeDir, validateWorkspaceName, listWorkspaces, createWorkspace, getWorkspacesDir } from '../core'
import { WorkspaceError } from '../types'

let testDir: string

beforeEach(async () => {
    // Create unique temp directory with test-specific name
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), `mandrake-test-${Date.now()}-`))
    process.env.MANDRAKE_DIR = testDir

    // Important: We shouldn't initialize here - let each test do its own setup
    // Remove the initMandrakeDir() call from beforeEach
})

afterEach(async () => {
    // Clean up env and files
    delete process.env.MANDRAKE_DIR
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
        // Set up fresh state for this test
        await initMandrakeDir()
        await createWorkspace('workspace1', 'First Workspace')
        await createWorkspace('workspace2', 'Second Workspace')

        const workspaces = await listWorkspaces()
        expect(workspaces).toHaveLength(2)
        expect(workspaces.map(w => w.name)).toContain('workspace1')
        expect(workspaces.map(w => w.name)).toContain('workspace2')
    })
})
