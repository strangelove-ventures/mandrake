import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { LogBuffer } from './logger'
import type { Stream } from 'node:stream'
import { TransportFactory } from './transport'
import type { ServerConfig, ServerState, MCPTool } from './types'

// Default client config 
const CLIENT_CONFIG = {
  info: {
    name: 'mandrake-client',
    version: '1.0.0',
  },
  options: {
    capabilities: {},
  },
}

export interface MCPServer {
  getId(): string
  getName(): string
  start(): Promise<void>
  stop(): Promise<void>
  listTools(): Promise<MCPTool[]>
  invokeTool(name: string, params: any): Promise<any>
}

export class MCPServerImpl implements MCPServer {
  private client?: Client
  private transport?: ReturnType<typeof TransportFactory.create>
  private logBuffer: LogBuffer
  private state: ServerState
  
  constructor(private config: ServerConfig) {
    this.logBuffer = new LogBuffer()
    this.state = {
      retryCount: 0,
      logs: []
    }
  }

  getId(): string {
    return this.config.name
  }

  getName(): string {
    return this.config.name
  }

  async start() {
    try {
      // Create client first
      this.client = new Client(
        CLIENT_CONFIG.info,
        CLIENT_CONFIG.options
      )

      // Create transport
      this.transport = TransportFactory.create(this.config)

      // Setup stderr logging if stdio transport
      if (this.transport instanceof StdioClientTransport) {
        this.handleStderr(this.transport.stderr)
      }

      // Connect client with transport
      await this.client.connect(this.transport)

      // Reset state on successful connection
      this.state.retryCount = 0
      this.state.error = undefined
      this.logBuffer.append('Server started successfully')
      
    } catch (error) {
      await this.handleStartError(error)
    }
  }

  private async handleStartError(error: any) {
    this.state.error = error.message
    this.state.lastRetryTimestamp = Date.now()
    this.logBuffer.append(`Start error: ${error.message}`)
    
    if (this.state.retryCount < 3) {
      const delay = Math.pow(2, this.state.retryCount) * 1000 // Exponential backoff in ms
      this.state.retryCount++
      
      this.logBuffer.append(`Retrying in ${delay}ms (attempt ${this.state.retryCount}/3)`)
      await new Promise(resolve => setTimeout(resolve, delay))
      await this.start()
    } else {
      this.logBuffer.append('Max retry attempts reached')
    }
  }

  async stop() {
    try {
      if (this.client) {
        await this.client.close()
        this.client = undefined
      }

      if (this.transport) {
        await this.transport.close()
        this.transport = undefined
      }

      this.logBuffer.append('Server stopped')
      
    } catch (error) {
      this.state.error = `Error stopping server: ${(error as Error).message}`
      this.logBuffer.append(this.state.error)
    }
  }

  async invokeTool(method: string, args: Record<string, any>) {
    if (this.config.disabled) {
      throw new Error('Server is disabled')
    }

    if (!this.client) {
      throw new Error('Server not connected')
    }

    try {
      const result = await this.client.callTool({ 
        name: method,
        arguments: args 
      })
      this.logBuffer.append(`Tool call successful: ${method}`)
      return result
    } catch (error) {
      const errorMsg = `Tool call failed: ${method} - ${(error as Error).message}`
      this.logBuffer.append(errorMsg)
      throw new Error(errorMsg)
    }
  }

  async listTools(): Promise<MCPTool[]> {
    if (this.config.disabled) {
      return []
    }

    if (!this.client) {
      throw new Error('Server not connected')
    }

    try {
      const response = await this.client.listTools()
      return response.tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema.properties || {}
      }))
    } catch (error) {
      this.logBuffer.append(`Failed to list tools: ${(error as Error).message}`)
      return []
    }
  }

  getState(): ServerState {
    return {
      ...this.state,
      logs: this.logBuffer.getLogs()
    }
  }

  private handleStderr(stream: Stream | null) {
    if (!stream) return

    stream.on('data', (data: Buffer) => {
      const output = data.toString()
      this.logBuffer.append(output)

      if (output.toLowerCase().includes('error')) {
        this.state.error = output
      }
    })
  }

  getConfig(): ServerConfig {
    return { ...this.config }
  }
}
