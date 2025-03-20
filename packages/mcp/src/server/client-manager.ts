import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { z } from 'zod'
import { createLogger } from '@mandrake/utils'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { 
  MCPError, 
  ServerNotConnectedError,
  ToolInvocationError, 
  ToolNotFoundError,
  convertToMCPError,
  MCPErrorCode
} from '../errors'

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
 * Manages MCP client operations
 * 
 * This class is responsible for:
 * - Creating and managing the MCP client
 * - Handling tool invocation
 * - Managing tools list and completions
 */
export class ClientManager {
  private client?: Client
  private logger = createLogger('mcp').child({ 
    meta: { component: 'client-manager', id: this.id }
  })
  
  constructor(
    private id: string
  ) {}

  /**
   * Create and connect a client with the given transport
   */
  async createAndConnectClient(transport: Transport): Promise<Client> {
    try {
      // Create client
      this.client = new Client(
        CLIENT_CONFIG.info,
        CLIENT_CONFIG.options
      )

      // Connect client with transport
      await this.client.connect(transport)
      
      return this.client
    } catch (error) {
      // Clean up client if connection fails
      this.client = undefined
      throw error
    }
  }

  /**
   * Close the client
   */
  async closeClient(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = undefined
    }
  }

  /**
   * Get the current client
   */
  getClient(): Client | undefined {
    return this.client
  }

  /**
   * Verify client is connected or throw error
   */
  verifyConnected(): Client {
    if (!this.client) {
      throw new ServerNotConnectedError(this.id)
    }
    return this.client
  }

  /**
   * Invoke a tool method on the MCP server
   */
  async invokeTool(
    method: string, 
    args: Record<string, any>
  ): Promise<any> {
    const client = this.verifyConnected()
    
    try {
      const result = await client.callTool({
        name: method,
        arguments: args
      })

      // Check if result indicates an error and throw it
      if (result.isError) {
        // result.content is [{type: 'text', text: 'Test error'}]  
        const errorText = (result.content as any)[0]?.text || 'Unknown error from tool'
        
        const toolError = new ToolInvocationError(
          this.id,
          method,
          errorText,
          undefined,
          { args, result }
        )
        throw toolError
      }

      return result
    } catch (error) {
      // If it's already a MCPError, just pass it through
      if (error instanceof MCPError) {
        throw error
      }
      
      // Convert to ToolInvocationError
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      const toolError = new ToolInvocationError(
        this.id,
        method,
        errorMsg,
        error instanceof Error ? error : undefined,
        { args }
      )
      
      throw toolError
    }
  }

  /**
   * List all available tools from the MCP server
   */
  async listTools(): Promise<Tool[]> {
    try {
      const client = this.verifyConnected()
      const response = await client.listTools()
      
      this.logger.info('Tools list retrieved successfully', { 
        id: this.id, 
        count: response.tools.length 
      })
      
      return response.tools
    } catch (error) {
      // If server not connected, just return empty array
      if (error instanceof ServerNotConnectedError) {
        return []
      }
      
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      this.logger.error('Failed to list tools', {
        id: this.id,
        error: errorMsg
      })
      
      return []
    }
  }

  /**
   * Get tool completion suggestions for an argument
   */
  async getCompletions(
    methodName: string,
    argName: string,
    value: string
  ): Promise<string[]> {
    const client = this.verifyConnected()
    
    try {
      // First, check if the method exists
      const tools = await this.listTools()
      const tool = tools.find(t => t.name === methodName)
      
      if (!tool) {
        this.logger.warn('Tool not found for completions', { id: this.id, methodName })
        throw new ToolNotFoundError(this.id, methodName)
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
        const response = await client.request(request, z.object({}).passthrough())
        const completionResult = response as { completion?: { values?: string[] } }
        
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
      // If it's already a MCPError, just pass it through
      if (error instanceof MCPError) {
        throw error
      }
      
      // Convert to MCPError
      const mcpError = convertToMCPError(
        error,
        MCPErrorCode.COMPLETIONS_FAILED,
        `Failed to get completions for ${methodName}.${argName}`,
        this.id,
        { methodName, argName, value }
      )
      
      throw mcpError
    }
  }
}