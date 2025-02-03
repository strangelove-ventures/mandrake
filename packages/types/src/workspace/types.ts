import type { ServerConfig } from '../'

export interface Workspace {
  id: string
  name: string
  description?: string
  created: string
}

// These represent the individual JSON files
export interface ToolsConfig {
  tools: ServerConfig[]
}

export interface ModelsConfig {
  provider: string
  apiKey?: string
  baseURL?: string
  maxTokens: number
  temperature: number
}

export interface ContextConfig {
  refresh: {
    [toolId: string]: {
      enabled: boolean
      interval?: string
      onDemand?: boolean
    }
  }
}

// Then for API/internal use, we can have an aggregate type
export interface WorkspaceFullConfig {
  tools: ToolsConfig
  models: ModelsConfig
  context: ContextConfig
  systemPrompt: string
}

export class WorkspaceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkspaceError'
  }
}

export class WorkspaceNotFoundError extends WorkspaceError {
  constructor(name: string) {
    super(`Workspace "${name}" not found`)
    this.name = 'WorkspaceNotFoundError'
  }
}