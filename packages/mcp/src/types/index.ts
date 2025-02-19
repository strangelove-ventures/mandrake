import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export interface MCPConnection {
  server: {
    name: string
    status: 'connected' | 'disconnected' | 'connecting'
    error?: string
    tools?: Tool[]
    disabled?: boolean
  }
  client: Client
  transport: StdioClientTransport | SSEClientTransport
}

export interface ToolWithServer extends Tool {
  serverName: string;
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