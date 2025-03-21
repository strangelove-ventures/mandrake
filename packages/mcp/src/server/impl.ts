import { createLogger } from '@mandrake/utils'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { MCPServer, ServerConfig, ServerState } from '../types'
import { ServerLifecycle } from './lifecycle'
import { TransportManager } from './transport-manager'
import { ClientManager } from './client-manager'
import { ProxyManager } from './proxy-manager'
import { ConfigManager } from '../config'

/**
 * Enhanced MCP Server implementation using composition pattern
 * 
 * This implementation improves upon the original with:
 * - Better separation of concerns through composition
 * - Improved error handling
 * - More focused component responsibilities
 * - Better testability
 */
export class MCPServerImpl implements MCPServer {
  private lifecycle: ServerLifecycle
  private transportManager: TransportManager
  private clientManager: ClientManager
  private proxyManager: ProxyManager
  private logger = createLogger('mcp').child({ 
    meta: { component: 'server', id: this.id }
  })
  
  constructor(
    private id: string,
    userConfig: ServerConfig
  ) {
    // Validate and normalize the config
    const config = ConfigManager.validate(userConfig)
    
    this.lifecycle = new ServerLifecycle(id, config)
    this.transportManager = new TransportManager(id, 
      (output, level, metadata) => this.lifecycle.log(output, level, metadata)
    )
    this.clientManager = new ClientManager(id)
    this.proxyManager = new ProxyManager(id)
    
    // Connect the proxy manager to the lifecycle
    this.lifecycle.setProxyManager(this.proxyManager)
    
    // Initialize health manager with a reference to this server
    // This needs to happen after the server instance is constructed
    this.lifecycle.initHealthManager(this)
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
      const config = this.getConfig()
      this.logger.debug('Starting MCP server', { 
        id: this.id, 
        command: config.command,
        args: config.args,
        disabled: config.disabled 
      })
      
      // If server is disabled, don't attempt to start
      if (this.lifecycle.isDisabled()) {
        const msg = 'Server is disabled, not starting'
        this.lifecycle.log(msg)
        this.logger.info(msg)
        return
      }
      
      // Create transport
      const transport = this.transportManager.createTransport(this.getConfig())
      
      // Create and connect client
      await this.clientManager.createAndConnectClient(transport)
      
      // Create a proxy using the shared transport
      // This is a special case where we use the same transport for both client and server sides
      // The proxy implementation detects this case and handles it appropriately
      this.proxyManager.createProxy(
        transport,  // Client side
        transport,  // Server side (same object as client - proxy will detect this)
        {
          // Additional configuration options
          enableReconnection: false,  // We don't need reconnection for shared transport
          onError: (error, source) => {
            // Log errors for better troubleshooting
            this.logger.error(`Proxy error (${source}): ${error.message}`, {
              error: error.stack,
              source
            })
          },
          onStateChange: (oldState, newState) => {
            this.logger.debug(`Proxy state changed from ${oldState} to ${newState}`)
          }
        }
      )
      
      // Update lifecycle state
      this.lifecycle.handleConnectionSuccess()
      
    } catch (error) {
      // Handle error with retry logic
      const shouldRetry = await this.lifecycle.handleConnectionError(error)
      
      // Retry if needed
      if (shouldRetry) {
        await this.start()
      }
    }
  }

  /**
   * Stop the MCP server
   * 
   * Closes all connections and transports cleanly.
   */
  async stop() {
    this.logger.debug('Stopping server', { id: this.id })
    
    try {
      // Clean up in reverse order of creation
      await this.proxyManager.closeProxy()
      await this.clientManager.closeClient()
      await this.transportManager.closeTransport()
      
      this.lifecycle.logServerStopped()
    } catch (error) {
      this.lifecycle.logServerStopError(error)
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
    this.lifecycle.logToolInvocation(method, args)
    
    // Verify server is enabled
    this.lifecycle.verifyEnabled()
    
    try {
      // Invoke tool using client manager
      const result = await this.clientManager.invokeTool(method, args)
      
      this.lifecycle.logToolInvocationSuccess(method)
      
      return result
    } catch (error: any) {
      // Log the error
      this.lifecycle.logToolInvocationError(method, error)
      
      // Re-throw error
      throw error
    }
  }

  /**
   * List all available tools from the MCP server
   * 
   * @returns Array of available tools
   */
  async listTools(): Promise<Tool[]> {
    this.logger.debug('Listing tools', { id: this.id })
    
    if (this.lifecycle.isDisabled()) {
      this.logger.info('Server is disabled, returning empty tools list', { id: this.id })
      return []
    }

    return this.clientManager.listTools()
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
    
    // Verify server is enabled
    this.lifecycle.verifyEnabled()
    
    try {
      // Get completions from client manager
      const completions = await this.clientManager.getCompletions(methodName, argName, value)
      
      this.lifecycle.log(`Completions received for ${methodName}.${argName}`)
      
      return completions
    } catch (error: any) {
      // Log error
      this.lifecycle.log(`Error getting completions for ${methodName}.${argName}: ${error.message}`)
      
      // Re-throw error
      throw error
    }
  }

  /**
   * Get the current server state
   */
  getState(): ServerState & { status: string } {
    return this.lifecycle.getState(!!this.clientManager.getClient())
  }

  /**
   * Get the server configuration
   */
  getConfig(): ServerConfig {
    return this.lifecycle.getConfig()
  }
  
  /**
   * Run a health check on the server
   * 
   * @returns Promise that resolves to true if server is healthy, false otherwise
   */
  async checkHealth(): Promise<boolean> {
    return this.lifecycle.checkHealth()
  }
}