// packages/types/src/workspace/sync.ts
import path from 'path'
import fs from 'fs/promises'
import { getWorkspacesDir, createWorkspace } from './core'
import { readWorkspaceConfig, ensureDir, getWorkspacePath } from './files'
import { initWorkspaceConfig } from './config'
import type { Workspace } from './types'

export interface SyncResult {
    added: string[]    // Workspaces added to DB
    removed: string[]  // Workspaces removed from DB
    synced: string[]   // Workspaces that existed in both
}

export async function syncWorkspaces(prisma: any): Promise<SyncResult> {
    const result: SyncResult = {
        added: [],
        removed: [],
        synced: []
    }

    try {
        // Ensure base directories exist
        await ensureDir(getWorkspacesDir())

        // Get all workspaces from DB
        const dbWorkspaces = await prisma.workspace.findMany()

        // Get all workspaces from filesystem
        let fsWorkspaces: Workspace[] = []
        const workspacesDir = getWorkspacesDir()

        try {
            const dirs = await fs.readdir(workspacesDir, { withFileTypes: true })
            for (const dir of dirs.filter(d => d.isDirectory())) {
                try {
                    const config = await readWorkspaceConfig(dir.name)
                    fsWorkspaces.push(config)
                } catch (error) {
                    // If workspace.json doesn't exist but DB entry does,
                    // recreate the filesystem structure
                    const dbWorkspace = dbWorkspaces.find(
                        (w: { name: string }) => w.name === dir.name
                    )
                    if (dbWorkspace) {
                        await createWorkspace(
                            dbWorkspace.name,
                            dbWorkspace.id,
                            dbWorkspace.description || undefined
                        )
                        fsWorkspaces.push({
                            id: dbWorkspace.id,
                            name: dbWorkspace.name,
                            description: dbWorkspace.description || undefined,
                            created: dbWorkspace.createdAt.toISOString()
                        })
                    } else {
                        console.warn(`Failed to read workspace ${dir.name}:`, error)
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to read workspaces directory:', error)
        }

        // Create DB entries for filesystem workspaces that don't exist in DB
        for (const fsWorkspace of fsWorkspaces) {
            const existingDb = dbWorkspaces.find((db: { id: string }) => db.id === fsWorkspace.id)
            if (!existingDb) {
                await prisma.workspace.create({
                    data: {
                        id: fsWorkspace.id,
                        name: fsWorkspace.name,
                        description: fsWorkspace.description,
                        created: new Date(fsWorkspace.created)
                    }
                })
                result.added.push(fsWorkspace.name)
            } else {
                result.synced.push(fsWorkspace.name)
            }
        }

        // Create filesystem structure for DB workspaces that don't exist on disk
        for (const dbWorkspace of dbWorkspaces) {
            const existingFs = fsWorkspaces.find(fs => fs.id === dbWorkspace.id)
            if (!existingFs) {
                const paths = getWorkspacePath(dbWorkspace.name)

                // Create directory structure
                await Promise.all([
                    ensureDir(paths.config),
                    ensureDir(paths.contextFiles),
                    ensureDir(paths.src)
                ])

                // Initialize workspace files
                await initWorkspaceConfig(paths.root)

                result.added.push(dbWorkspace.name)
            }
        }

        return result
    } catch (error) {
        console.error('Failed to sync workspaces:', error)
        throw error
    }
}