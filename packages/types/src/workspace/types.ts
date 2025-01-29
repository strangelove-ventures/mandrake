import type { ServerConfig } from '../'
import type { LLMProviderConfig } from '@mandrake/langchain'

export interface Workspace {
  id: string
  name: string
  description?: string
  created: string
}

export interface WorkspaceConfig {
  tools: ServerConfig[]
  models: LLMProviderConfig
  context: {
    refresh: {
      [toolId: string]: {
        enabled: boolean
        interval?: string
        onDemand?: boolean
      }
    }
  }
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