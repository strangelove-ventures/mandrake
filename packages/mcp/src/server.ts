import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { z } from 'zod'
import { createLogger } from '@mandrake/utils'
import { LogBuffer } from './logger'
import type { Stream } from 'node:stream'
import { TransportFactory } from './transport'
import { MCPProxy } from './proxy'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { MCPServer, ServerConfig, ServerState } from './types'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

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

/**
 * Enhanced MCP Server implementation
 * 
 * This implementation improves upon the original with:
 * - Better lifecycle management
 * - Improved error handling
 * - Support for reconnection
 * - Enhanced logging
 * - Better status tracking
 */
export class MCPServerImpl implements MCPServer {
  private client?: Client
  private transport?: ReturnType<typeof TransportFactory.create>
  private proxy?: MCPProxy
  private logBuffer: LogBuffer
  private state: ServerState
  private logger = createLogger('mcp').child({ 
    meta: { component: 'server', id: this.id }
  })
  
  constructor(
    private id: string,
    private config: ServerConfig
  ) {
    this.id = id
    this.logBuffer = new LogBuffer()
    this.state = {
      retryCount: 0,
      logs: []
    }
  }

  getId(): string {
    return this.id
  }

  /**
   * Start the MCP server
   * 
   * This method initializes the client, creates the transport,
   * and establishes a connection to the server.
   */
  async start() {
    try {
      this.logger.info('Starting MCP server', { 
        id: this.id, 
        command: this.config.command,
        args: this.config.args,
        disabled: this.config.disabled 
      })
      
      // Log attempt if retrying
      if (this.state.retryCount > 0) {
        this.logBuffer.append(`Connection attempt ${this.state.retryCount + 1}/4`)
      }
      
      // If server is disabled, don't attempt to start
      if (this.config.disabled) {
        const msg = 'Server is disabled, not starting'
        this.logBuffer.append(msg)
        this.logger.info(msg)
        return
      }
      
      // Create client first
      this.client = new Client(
        CLIENT_CONFIG.info,
        CLIENT_CONFIG.options
      )

      // Create transport
      this.transport = TransportFactory.create(this.config)

      // Setup stderr logging if stdio transport
      if (this.transport instanceof StdioClientTransport && this.transport.stderr) {
        this.handleStderr(this.transport.stderr)
      }

      // Connect client with transport
      await this.client.connect(this.transport)
      
      // Update state on successful connection
      this.state.retryCount = 0
      this.state.error = undefined
      this.state.lastRetryTimestamp = undefined
      
      this.logBuffer.append('Connected successfully')
      this.logger.info('Server started successfully', { id: this.id })
      
    } catch (error) {
      await this.handleStartError(error)
    }
  }

  /**
   * Handle errors during server startup
   * 
   * Implements exponential backoff for retries with a maximum of 3 attempts.
   */
  private async handleStartError(error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    this.state.error = errorMsg
    this.state.lastRetryTimestamp = Date.now()
    this.logBuffer.append(`Start error: ${errorMsg}`)
    
    this.logger.error('Failed to start server', {
      id: this.id,
      error: errorMsg,
      retryCount: this.state.retryCount
    })
    
    // Implement retry with exponential backoff
    if (this.state.retryCount < 3) {
      const delay = Math.pow(2, this.state.retryCount) * 1000 // Exponential backoff in ms
      this.state.retryCount++
      
      this.logBuffer.append(`Retrying in ${delay}ms (attempt ${this.state.retryCount}/3)`)
      this.logger.info('Scheduling retry', { 
        id: this.id, 
        delay, 
        attempt: this.state.retryCount 
      })
      
      await new Promise(resolve => setTimeout(resolve, delay))
      await this.start()
    } else {
      const msg = 'Max retry attempts reached'
      this.logBuffer.append(msg)
      this.logger.warn(msg, { id: this.id })
    }
  }

  /**
   * Stop the MCP server
   * 
   * Closes all connections and transports cleanly.
   */
  async stop() {
    this.logger.info('Stopping server', { id: this.id })
    
    try {
      // Clean up in reverse order of creation
      if (this.proxy) {
        await this.proxy.close()
        this.proxy = undefined
      }
      
      if (this.client) {
        await this.client.close()
        this.client = undefined
      }

      if (this.transport) {
        await this.transport.close()
        this.transport = undefined
      }

      this.logBuffer.append('Server stopped')
      this.logger.info('Server stopped successfully', { id: this.id })

    } catch (error) {
      const msg = `Error stopping server: ${(error as Error).message}`
      this.logger.error('Failed to stop server', {
        id: this.id,
        error: error instanceof Error ? error.message : String(error)
      })
      
      this.state.error = msg
      this.logBuffer.append(this.state.error)
    }
  }

  /**
   * Invoke a tool method on the MCP server
   * 
   * @param method The name of the tool method to invoke
   * @param args Arguments for the tool method
   * @returns The result of the tool invocation
   */
  async invokeTool(method: string, args: Record<string, any>) {
    this.logger.info('Invoking tool', { id: this.id, method, args })
    
    if (this.config.disabled) {
      const msg = 'Server is disabled'
      this.logBuffer.append(msg)
      throw new Error(msg)
    }

    if (!this.client) {
      const msg = 'Server not connected'
      this.logBuffer.append(msg)
      throw new Error(msg)
    }

    try {
      this.logBuffer.append(`Invoking tool: ${method}`)
      
      const result = await this.client.callTool({
        name: method,
        arguments: args
      })

      // Check if result indicates an error and throw it
      if (result.isError) {
        // result.content is [{type: 'text', text: 'Test error'}]  
        const errorText = (result.content as any)[0]?.text || 'Unknown error from tool'
        this.logBuffer.append(`Tool error: ${errorText}`)
        throw new Error(errorText)
      }

      this.logBuffer.append(`Tool call successful: ${method}`)
      this.logger.info('Tool invocation successful', { id: this.id, method })
      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logBuffer.append(`Tool error: ${errorMsg}`)
      
      this.logger.error('Tool invocation failed', {
        id: this.id,
        method,
        error: errorMsg
      })
      
      throw new Error(`Error invoking ${method}: ${errorMsg}`)
    }
  }

  /**
   * List all available tools from the MCP server
   * 
   * @returns Array of available tools
   */
  async listTools(): Promise<Tool[]> {
    this.logger.info('Listing tools', { id: this.id })
    
    if (this.config.disabled) {
      this.logger.info('Server is disabled, returning empty tools list', { id: this.id })
      return []
    }

    if (!this.client) {
      this.logger.warn('Server not connected, cannot list tools', { id: this.id })
      this.logBuffer.append('Cannot list tools: server not connected')
      return []
    }

    try {
      const response = await this.client.listTools()
      this.logger.info('Tools list retrieved successfully', { 
        id: this.id, 
        count: response.tools.length 
      })
      
      return response.tools
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logBuffer.append(`Failed to list tools: ${errorMsg}`)
      
      this.logger.error('Failed to list tools', {
        id: this.id,
        error: errorMsg
      })
      
      return []
    }
  }

  /**
   * Get tool completion suggestions for an argument
   * 
   * @param methodName The method name to get completions for
   * @param argName The argument name to get completions for
   * @param value The current value to use for completion
   * @returns Array of completion suggestions
   */
  async getCompletions(
    methodName: string,
    argName: string,
    value: string
  ): Promise<string[]> {
    this.logger.info('Getting completions', { id: this.id, methodName, argName, value })
    
    if (this.config.disabled) {
      return []
    }

    if (!this.client) {
      this.logBuffer.append('Cannot get completions: server not connected')
      throw new Error('Server not connected')
    }

    try {
      // First, check if the method exists
      const tools = await this.listTools()
      const tool = tools.find(t => t.name === methodName)
      
      if (!tool) {
        this.logger.warn('Tool not found for completions', { id: this.id, methodName })
        return []
      }
      
      // Create the completion request
      const request = {
        method: "completion/complete",
        params: {
          argument: {
            name: argName,
            value,
          },
          ref: {
            type: "resource",
            id: methodName,
          },
        },
      }
      
      try {
        // Make the completion request without a specific schema
        // The request response will be treated as a generic object
        const response = await this.client.request(request, z.object({}).passthrough())
        const completionResult = response as { completion?: { values?: string[] } }
        
        this.logBuffer.append(`Completions received for ${methodName}.${argName}`)
        this.logger.info('Completions received', { 
          id: this.id,
          methodName, 
          argName, 
          count: completionResult.completion?.values?.length 
        })
        
        return completionResult.completion?.values || []
      } catch (error) {
        // If the server doesn't support completions, return empty array
        if (error instanceof Error && 'code' in error && error.code === "MethodNotFound") {
          this.logger.info('Completions not supported by server', { id: this.id, methodName })
          return []
        }
        
        // Otherwise, propagate the error
        throw error
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      this.logger.error('Failed to get completions', { 
        id: this.id, 
        methodName, 
        argName, 
        error: errorMsg 
      })
      
      this.logBuffer.append(`Error getting completions for ${methodName}.${argName}: ${errorMsg}`)
      throw new Error(`Error getting completions: ${errorMsg}`)
    }
  }

  /**
   * Get the current server state
   */
  getState(): ServerState & { status: string } {
    return {
      ...this.state,
      logs: this.logBuffer.getLogs(),
      status: this.getStatus()
    }
  }

  /**
   * Determine the current server status
   */
  private getStatus(): string {
    if (this.config.disabled) {
      return 'disabled'
    }
    
    if (!this.client) {
      return 'disconnected'
    }
    
    if (this.state.error) {
      return 'error'
    }
    
    if (this.state.retryCount > 0) {
      return 'connecting'
    }
    
    return 'connected'
  }

  /**
   * Handle stderr output from stdio transports
   */
  private handleStderr(stream: Stream | null) {
    if (!stream) return

    stream.on('data', (data: Buffer) => {
      const output = data.toString()
      this.logBuffer.append(output)

      // Check for error indicators in the output
      if (output.toLowerCase().includes('error')) {
        this.state.error = output
        this.logger.error('Error from server stderr', { 
          id: this.id, 
          error: output 
        })
      }
    })
  }

  /**
   * Get the server configuration
   */
  getConfig(): ServerConfig {
    return { ...this.config }
  }
}
