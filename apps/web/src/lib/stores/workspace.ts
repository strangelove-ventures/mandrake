// apps/web/src/lib/stores/workspace.ts
import { create } from 'zustand'
import type {
    Workspace,
    ToolsConfig,
    ModelsConfig,
    ContextConfig,
    WorkspaceFullConfig
} from '@mandrake/types'

interface CurrentWorkspace extends Workspace {
    config?: WorkspaceFullConfig
}

interface WorkspaceState {
    workspaces: Workspace[]
    currentWorkspace?: CurrentWorkspace
    loading: boolean
    error?: string
    serverStatuses: Record<string, string>
    // List operations
    refreshServerStatuses: () => Promise<void>
    loadWorkspaces: () => Promise<void>
    createWorkspace: (name: string, description?: string) => Promise<void>
    deleteWorkspace: (id: string) => Promise<void>

    // Single workspace operations
    loadWorkspace: (id: string) => Promise<void>

    // Config operations
    updateTools: (id: string, config: ToolsConfig) => Promise<void>
    updateModels: (id: string, config: ModelsConfig) => Promise<void>
    updateContext: (id: string, config: ContextConfig) => Promise<void>
    updateSystemPrompt: (id: string, prompt: string) => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    workspaces: [],
    loading: false,
    serverStatuses: {},

    refreshServerStatuses: async () => {
        const { currentWorkspace } = get()
        if (!currentWorkspace) return

        try {
            const response = await fetch(`/api/workspace/${currentWorkspace.id}/server-status`)
            if (!response.ok) throw new Error('Failed to fetch server statuses')

            const statuses = await response.json()
            set({ serverStatuses: statuses })
        } catch (error) {
            console.error('Failed to refresh server statuses:', error)
        }
    },

    loadWorkspaces: async () => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch('/api/workspace')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to load workspaces')
            }

            set({ workspaces: data.workspaces || [], loading: false })
        } catch (error) {
            set({
                workspaces: [],
                error: error instanceof Error ? error.message : 'Failed to load workspaces',
                loading: false
            })
        }
    },

    createWorkspace: async (name: string, description?: string) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch('/api/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create workspace')
            }

            await get().loadWorkspaces()
            set({ loading: false })
        } catch (error) {
            set({ error: (error as Error).message, loading: false })
            throw error
        }
    },

    deleteWorkspace: async (id: string) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch(`/api/workspace/${id}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to delete workspace')
            }

            // Remove from workspaces list
            const { workspaces } = get()
            set({
                workspaces: workspaces.filter(w => w.id !== id),
                // Clear current workspace if it was the one deleted
                currentWorkspace: get().currentWorkspace?.id === id
                    ? undefined
                    : get().currentWorkspace,
                loading: false
            })
        } catch (error) {
            set({ error: (error as Error).message, loading: false })
            throw error
        }
    },

    loadWorkspace: async (id: string) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch(`/api/workspace/${id}`)

            // Handle response before trying to parse it
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to load workspace')
            }

            const workspace = await response.json()
            set({
                currentWorkspace: workspace,
                loading: false,
                error: undefined
            })
            await get().refreshServerStatuses()
        } catch (error) {
            set({
                currentWorkspace: undefined,
                error: (error as Error).message,
                loading: false
            })
        }
    },

    updateTools: async (id: string, config: ToolsConfig) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch(`/api/workspace/${id}/tools`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update tools')
            }

            // Update current workspace if loaded
            const { currentWorkspace } = get()
            if (currentWorkspace?.id === id && currentWorkspace.config) {
                set({
                    currentWorkspace: {
                        ...currentWorkspace,
                        config: {
                            ...currentWorkspace.config,
                            tools: config
                        }
                    },
                    loading: false
                })
            }
        } catch (error) {
            set({ error: (error as Error).message, loading: false })
            throw error
        }
    },

    updateModels: async (id: string, config: ModelsConfig) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch(`/api/workspace/${id}/models`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update models')
            }

            // Update current workspace if loaded
            const { currentWorkspace } = get()
            if (currentWorkspace?.id === id && currentWorkspace.config) {
                set({
                    currentWorkspace: {
                        ...currentWorkspace,
                        config: {
                            ...currentWorkspace.config,
                            models: config
                        }
                    },
                    loading: false
                })
            }
        } catch (error) {
            set({ error: (error as Error).message, loading: false })
            throw error
        }
    },

    updateContext: async (id: string, config: ContextConfig) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch(`/api/workspace/${id}/context`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update context')
            }

            // Update current workspace if loaded
            const { currentWorkspace } = get()
            if (currentWorkspace?.id === id && currentWorkspace.config) {
                set({
                    currentWorkspace: {
                        ...currentWorkspace,
                        config: {
                            ...currentWorkspace.config,
                            context: config
                        }
                    },
                    loading: false
                })
            }
        } catch (error) {
            set({ error: (error as Error).message, loading: false })
            throw error
        }
    },

    updateSystemPrompt: async (id: string, prompt: string) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch(`/api/workspace/${id}/system-prompt`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update system prompt')
            }

            // Update current workspace if loaded
            const { currentWorkspace } = get()
            if (currentWorkspace?.id === id && currentWorkspace.config) {
                set({
                    currentWorkspace: {
                        ...currentWorkspace,
                        config: {
                            ...currentWorkspace.config,
                            systemPrompt: prompt
                        }
                    },
                    loading: false
                })
            }
        } catch (error) {
            set({ error: (error as Error).message, loading: false })
            throw error
        }
    }
}))