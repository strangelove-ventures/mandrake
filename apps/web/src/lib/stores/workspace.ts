// apps/web/src/lib/stores/workspace.ts
import { create } from 'zustand'
import type {
    Workspace,
    ToolsConfig,
    ModelsConfig,
    ContextConfig,
    ContextFile,
    WorkspaceFullConfig,
    DynamicContextMethodConfig,
    Session
} from '@mandrake/types'
import { FileWatcherService, FileChangeEvent } from '../services/file-watcher'

interface CurrentWorkspace extends Workspace {
    config?: WorkspaceFullConfig
}

interface WorkspaceState {
    workspaces: Workspace[]
    currentWorkspace?: CurrentWorkspace
    loading: boolean
    error?: string
    currentFiles: ContextFile[]
    fileWatcher: EventSource | null 
    watchingWorkspace: string | null
    serverStatuses: Record<string, string>
    sessions: Session[];
    loadWorkspaceSessions: (workspaceId: string) => Promise<void>;
    refreshServerStatuses: () => Promise<void>
    loadWorkspaces: () => Promise<void>
    createWorkspace: (name: string, description?: string) => Promise<void>
    deleteWorkspace: (id: string) => Promise<void>
    loadWorkspace: (id: string) => Promise<void>
    updateTools: (id: string, config: ToolsConfig) => Promise<void>
    updateModels: (id: string, config: ModelsConfig) => Promise<void>
    updateContext: (id: string, config: ContextConfig) => Promise<void>
    startWatchingFiles: (workspaceId: string) => Promise<void>
    stopWatchingFiles: () => void
    refreshContextFiles: (workspaceId: string) => Promise<void>
    updateContextFiles: (files: ContextFile[]) => void
    updateSystemPrompt: (id: string, prompt: string) => Promise<void>
    addDynamicContext: (id: string, context: Omit<DynamicContextMethodConfig, 'id'>) => Promise<void>;
    updateDynamicContext: (id: string, contextId: string, updates: Partial<DynamicContextMethodConfig>) => Promise<void>;
    removeDynamicContext: (id: string, contextId: string) => Promise<void>;
    testDynamicContext: (toolId: string, method: string, params: Record<string, any>) => Promise<any>;

}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    workspaces: [],
    loading: false,
    serverStatuses: {},
    currentFiles: [],
    fileWatcher: null,
    watchingWorkspace: null,
    sessions: [],

    loadWorkspaceSessions: async (workspaceId: string) => {
        try {
            const response = await fetch(`/api/workspace/${workspaceId}/sessions`)
            if (!response.ok) throw new Error('Failed to load sessions')

            const sessions = await response.json()
            set({ sessions })
        } catch (error) {
            console.error('Failed to load sessions:', error)
        }
    },

    // Modify existing loadWorkspace to include sessions
    loadWorkspace: async (id: string) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch(`/api/workspace/${id}`)
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

            // Load everything needed for the workspace
            await Promise.all([
                get().startWatchingFiles(id),
                get().loadWorkspaceSessions(id),
                get().refreshServerStatuses()
            ])
        } catch (error) {
            set({
                currentWorkspace: undefined,
                error: (error as Error).message,
                loading: false
            })
        }
    },

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

    startWatchingFiles: async (workspaceId: string) => {
        const { watchingWorkspace, stopWatchingFiles } = get()

        // If already watching a different workspace, stop that first
        if (watchingWorkspace && watchingWorkspace !== workspaceId) {
            stopWatchingFiles()
        }

        try {
            // Initial file load
            const response = await fetch(`/api/workspace/${workspaceId}/context/files`)
            if (!response.ok) throw new Error('Failed to fetch context files')
            const files = await response.json()

            // Setup watcher
            const eventSource = new EventSource(`/api/workspace/${workspaceId}/context/files/stream`)

            eventSource.onmessage = (event) => {
                const fileEvent: FileChangeEvent = JSON.parse(event.data)
                // On any file change, refresh the file list
                get().refreshContextFiles(workspaceId)
            }

            eventSource.onerror = (error) => {
                console.error('File watcher error:', error)
                eventSource.close()
                set({ fileWatcher: null, watchingWorkspace: null })
            }

            set({
                currentFiles: files,
                fileWatcher: eventSource,
                watchingWorkspace: workspaceId
            })
        } catch (error) {
            console.error('Failed to start file watching:', error)
        }
    },

    refreshContextFiles: async (workspaceId: string) => {
        try {
            const response = await fetch(`/api/workspace/${workspaceId}/context/files`)
            if (!response.ok) throw new Error('Failed to fetch context files')
            const files = await response.json()
            set({ currentFiles: files })
        } catch (error) {
            console.error('Failed to refresh context files:', error)
        }
    },

    stopWatchingFiles: () => {
        const { fileWatcher } = get()
        if (fileWatcher) {
            fileWatcher.close()
            set({
                fileWatcher: null,
                watchingWorkspace: null,
                currentFiles: []
            })
        }
    },

    updateContextFiles: (files: ContextFile[]) => {
        set({ currentFiles: files })
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
    },
    addDynamicContext: async (id: string, context: Omit<DynamicContextMethodConfig, 'id'>) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch(`/api/workspace/${id}/dynamic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(context)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to add dynamic context')
            }

            const newContext = await response.json()

            // Update current workspace if loaded
            const { currentWorkspace } = get()
            if (currentWorkspace?.id === id && currentWorkspace.config) {
                set({
                    currentWorkspace: {
                        ...currentWorkspace,
                        config: {
                            ...currentWorkspace.config,
                            context: {
                                ...currentWorkspace.config.context,
                                dynamicContexts: [
                                    ...(currentWorkspace.config.context.dynamicContexts || []),
                                    newContext
                                ]
                            }
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

    updateDynamicContext: async (id: string, contextId: string, updates: Partial<DynamicContextMethodConfig>) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch(`/api/workspace/${id}/dynamic`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dynamicContextId: contextId, updates })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update dynamic context')
            }

            const updatedContext = await response.json()

            // Update current workspace if loaded
            const { currentWorkspace } = get()
            if (currentWorkspace?.id === id && currentWorkspace.config) {
                const dynamicContexts = currentWorkspace.config.context.dynamicContexts || []
                const contextIndex = dynamicContexts.findIndex(dc => dc.id === contextId)

                if (contextIndex !== -1) {
                    dynamicContexts[contextIndex] = updatedContext
                    set({
                        currentWorkspace: {
                            ...currentWorkspace,
                            config: {
                                ...currentWorkspace.config,
                                context: {
                                    ...currentWorkspace.config.context,
                                    dynamicContexts
                                }
                            }
                        },
                        loading: false
                    })
                }
            }
        } catch (error) {
            set({ error: (error as Error).message, loading: false })
            throw error
        }
    },

    removeDynamicContext: async (id: string, contextId: string) => {
        set({ loading: true, error: undefined })
        try {
            const response = await fetch(`/api/workspace/${id}/dynamic`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dynamicContextId: contextId })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to remove dynamic context')
            }

            // Update current workspace if loaded
            const { currentWorkspace } = get()
            if (currentWorkspace?.id === id && currentWorkspace.config) {
                set({
                    currentWorkspace: {
                        ...currentWorkspace,
                        config: {
                            ...currentWorkspace.config,
                            context: {
                                ...currentWorkspace.config.context,
                                dynamicContexts: (currentWorkspace.config.context.dynamicContexts || [])
                                    .filter(dc => dc.id !== contextId)
                            }
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

    testDynamicContext: async (toolId: string, method: string, params: Record<string, any>) => {
        try {
            const response = await fetch(`/api/workspace/${toolId}/tools/${toolId}/${method}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to test dynamic context')
            }

            return await response.json()
        } catch (error) {
            console.error('Failed to test dynamic context:', error)
            throw error
        }
    }

}))