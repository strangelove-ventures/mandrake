// apps/web/src/lib/stores/workspace.ts
import { create } from 'zustand'
import {
    type Workspace,
    type WorkspaceChangeEvent,
    getWorkspaceWatcher,
    createWorkspace,
    listWorkspaces
} from '@mandrake/types'
import { PrismaClient } from '@prisma/client'

// Initialize Prisma client (we should move this to a shared db.ts)
const prisma = new PrismaClient()

interface WorkspaceState {
    workspaces: Workspace[]
    loading: boolean
    error?: string

    loadWorkspaces: () => Promise<void>
    createWorkspace: (name: string, description?: string) => Promise<void>
    deleteWorkspace?: (id: string) => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    workspaces: [],
    loading: false,

    loadWorkspaces: async () => {
        set({ loading: true, error: undefined })
        try {
            // Get filesystem state first
            const fsWorkspaces = await listWorkspaces()

            // Then get DB state for just these workspaces
            const dbWorkspaces = await prisma.workspace.findMany({
                where: {
                    id: {
                        in: fsWorkspaces.map(w => w.id)
                    }
                }
            })

            // Merge states, preferring DB for metadata
            const workspaces = fsWorkspaces.map(fsW => {
                const dbWorkspace = dbWorkspaces.find(dbW => dbW.id === fsW.id)
                return {
                    ...fsW,
                    ...dbWorkspace,
                    description: fsW.description ?? dbWorkspace?.description ??  undefined
                }
            })

            set({ workspaces, loading: false })
        } catch (error) {
            set({ error: (error as Error).message, loading: false })
        }
    },

    createWorkspace: async (name: string, description?: string) => {
        set({ loading: true, error: undefined })
        let id = ''
        try {
            // Create DB entry first
            const dbWorkspace = await prisma.workspace.create({
                data: { name, description }
            })
            id = dbWorkspace.id

            // Then create filesystem structure
            await createWorkspace(name, dbWorkspace.id, description)

            // Reload workspaces
            await get().loadWorkspaces()
        } catch (error) {
            // If anything fails, attempt cleanup
            if (error instanceof Error) {
                try {
                    await prisma.workspace.delete({
                        where: { id }
                    })
                } catch (cleanupError) {
                    console.error('Failed to cleanup workspace:', cleanupError)
                }
                set({ error: error.message, loading: false })
            }
            throw error
        }
    }
}))