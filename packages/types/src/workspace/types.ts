import type { ServerConfig } from '../'
import type { LLMProviderConfig } from '@mandrake/langchain'

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
  provider: string  // or whatever specific fields you need
  apiKey?: string
  baseURL?: string
  maxTokens: number
  temperature: number
}

export interface DynamicContextMethodConfig {
  id: string;           // Unique identifier for this config
  serverId: string;     // Which MCP server this uses
  methodName: string;   // Which method on that server
  params: Record<string, any>;  // The params for the method
  refresh: {
    enabled: boolean;
    interval?: string;  // Cron or duration string
    onDemand?: boolean;
  };
  tokenCount?: number;
  lastExecuted?: string;
  lastResult?: any;
}

export interface ContextConfig {
  dynamicContexts: DynamicContextMethodConfig[];
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