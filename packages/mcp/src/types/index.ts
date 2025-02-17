import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

export interface MCPTool {
  name: string
  description: string
  parameters: Record<string, any>
}

export interface MCPConnection {
  server: {
    name: string
    status: 'connected' | 'disconnected' | 'connecting'
    error?: string
    tools?: MCPTool[]
    disabled?: boolean
  }
  client: Client
  transport: StdioClientTransport | SSEClientTransport
}

export interface ServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  autoApprove?: string[]
  disabled?: boolean
}

export interface ServerState {
  error?: string
  lastRetryTimestamp?: number
  retryCount: number
  logs: string[]
}

export interface ToolCallParams {
  name: string
  arguments: Record<string, any>
}
