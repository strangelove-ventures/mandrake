import { MCPServerImpl } from './server'
import { createLogger } from '@mandrake/utils'
import type { ServerConfig, ServerState, ToolWithServerIdentifier } from './types'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { 
  MCPError, 
  MCPErrorCode, 
  ServerAlreadyExistsError, 
  ServerNotFoundError, 
  ToolInvocationError,
  convertToMCPError
} from './errors'

/**
 * MCP Manager
 * 
 * Central service responsible for managing MCP servers.
 * Enhanced with better error handling, status tracking, and health checks.
 */
export class MCPManager {
  private servers: Map<string, MCPServerImpl>
  private logger = createLogger('mcp').child({
    meta: { component: 'manager' }
  })
  private healthCheckInterval?: NodeJS.Timer

  constructor() {
    this.servers = new Map()
    // Start health check interval when manager is created
    this.startHealthChecks()
  }

  /**
   * Start a new MCP server
   * 
   * @param id Unique identifier for the server
   * @param config Server configuration
   */
  async startServer(id: string, config: ServerConfig) {
    this.logger.info('Starting server', { id, config })
    
    if (this.servers.has(id)) {
      const error = new ServerAlreadyExistsError(id)
      this.logger.warn(error.message, { id, error: error.toJSON() })
      throw error
    }

    try {
      const server = new MCPServerImpl(id, config)
      await server.start()
      this.servers.set(id, server)
      this.logger.info('Server started successfully', { id })
    } catch (error) {
      const mcpError = convertToMCPError(
        error, 
        MCPErrorCode.SERVER_START_FAILED,
        `Failed to start server ${id}`,
        id,
        { config }
      )
      this.logger.error('Failed to start server', { 
        id, 
        error: mcpError.toJSON() 
      })
      throw mcpError
    }
  }

  /**
   * Stop a running MCP server
   * 
   * @param id Server identifier
   */
  async stopServer(id: string) {
    this.logger.info('Stopping server', { id })
    
    const server = this.servers.get(id)
    if (!server) {
      const error = new ServerNotFoundError(id)
      this.logger.warn(error.message, { id, error: error.toJSON() })
      throw error
    }
    
    try {
      await server.stop()
      this.servers.delete(id)
      this.logger.info('Server stopped successfully', { id })
    } catch (error) {
      const mcpError = convertToMCPError(
        error,
        MCPErrorCode.SERVER_STOP_FAILED,
        `Failed to stop server ${id}`,
        id
      )
      this.logger.error('Error stopping server', { 
        id, 
        error: mcpError.toJSON() 
      })
      throw mcpError
    }
  }

  /**
   * Update an existing server with new configuration
   * 
   * @param id Server identifier
   * @param config New server configuration
   */
  async updateServer(id: string, config: ServerConfig) {
    this.logger.info('Updating server', { id })
    
    const server = this.servers.get(id)
    if (!server) {
      const error = new ServerNotFoundError(id)
      this.logger.warn(error.message, { id, error: error.toJSON() })
      throw error
    }

    try {
      await this.stopServer(id)
      await this.startServer(id, config)
      this.logger.info('Server updated successfully', { id })
    } catch (error) {
      // Don't wrap MCPError instances again
      if (error instanceof MCPError) {
        this.logger.error('Error updating server', { 
          id, 
          error: error.toJSON(), 
          phase: error.code === MCPErrorCode.SERVER_STOP_FAILED ? 'stop' : 'start' 
        })
        throw error
      }
      
      const mcpError = convertToMCPError(
        error,
        MCPErrorCode.UNKNOWN_ERROR,
        `Failed to update server ${id}`,
        id,
        { config }
      )
      this.logger.error('Error updating server', { 
        id, 
        error: mcpError.toJSON() 
      })
      throw mcpError
    }
  }

  /**
   * Restart a server with the same configuration
   * 
   * @param id Server identifier
   */
  async restartServer(id: string) {
    this.logger.info('Restarting server', { id })
    
    const server = this.servers.get(id)
    if (!server) {
      const msg = `Server ${id} not found`
      this.logger.warn(msg, { id })
      throw new Error(msg)
    }

    try {
      const config = server.getConfig()
      await this.stopServer(id)
      await this.startServer(id, config)
      this.logger.info('Server restarted successfully', { id })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error('Error restarting server', { id, error: errorMsg })
      throw error
    }
  }

  /**
   * List all tools from all enabled servers
   * 
   * @returns Array of tools with server identifiers
   */
  async listAllTools(): Promise<ToolWithServerIdentifier[]> {
    this.logger.info('Listing all tools from all servers')
    
    const allTools: ToolWithServerIdentifier[] = []
    const listPromises: Promise<void>[] = []
    
    // Create parallel promises for each server to improve performance
    for (const [id, server] of this.servers) {
      if (!server.getConfig().disabled) {
        const listPromise = server.listTools()
          .then(tools => {
            allTools.push(...tools.map(tool => ({
              ...tool,
              server: id
            })))
          })
          .catch(error => {
            this.logger.error('Error listing tools from server', {
              id,
              error: error instanceof Error ? error.message : String(error)
            })
            // Don't fail the entire operation if one server fails
            return []
          })
          
        listPromises.push(listPromise as Promise<void>)
      }
    }
    
    // Wait for all list operations to complete
    await Promise.all(listPromises)
    
    this.logger.info('Retrieved all tools', { count: allTools.length })
    return allTools
  }

  /**
   * Invoke a tool on a specific server
   * 
   * @param id Server identifier
   * @param method Tool method name
   * @param args Tool arguments
   * @returns Tool invocation result
   */
  async invokeTool(id: string, method: string, args: Record<string, any>) {
    this.logger.info('Invoking tool', { id, method })
    
    const server = this.servers.get(id)
    if (!server) {
      const error = new ServerNotFoundError(id)
      this.logger.warn(error.message, { id, error: error.toJSON() })
      throw error
    }

    try {
      const result = await server.invokeTool(method, args)
      this.logger.info('Tool invoked successfully', { id, method })
      return result
    } catch (error) {
      // If it's already a MCPError, just pass it through
      if (error instanceof MCPError) {
        this.logger.error('Error invoking tool', { 
          id, 
          method, 
          error: error.toJSON() 
        })
        throw error
      }
      
      // Convert generic errors to ToolInvocationError
      const errorMessage = error instanceof Error ? error.message : String(error)
      const toolError = new ToolInvocationError(
        id,
        method,
        errorMessage,
        error instanceof Error ? error : undefined,
        { args }
      )
      
      this.logger.error('Error invoking tool', { 
        id, 
        method, 
        error: toolError.toJSON() 
      })
      throw toolError
    }
  }

  /**
   * Get completions for a tool parameter
   * 
   * @param id Server identifier
   * @param methodName Tool method name
   * @param argName Argument name
   * @param value Current argument value
   * @returns Array of completion suggestions
   */
  async getCompletions(
    id: string, 
    methodName: string, 
    argName: string, 
    value: string
  ): Promise<string[]> {
    this.logger.info('Getting completions', { id, methodName, argName })
    
    const server = this.servers.get(id)
    if (!server) {
      const error = new ServerNotFoundError(id)
      this.logger.warn(error.message, { id, error: error.toJSON() })
      throw error
    }

    try {
      const completions = await server.getCompletions(methodName, argName, value)
      this.logger.info('Completions received', { 
        id, 
        methodName, 
        argName, 
        count: completions.length 
      })
      return completions
    } catch (error) {
      // If it's already a MCPError, just pass it through
      if (error instanceof MCPError) {
        this.logger.error('Error getting completions', { 
          id, 
          methodName, 
          argName, 
          error: error.toJSON() 
        })
        throw error
      }
      
      // Convert error to MCPError
      const mcpError = convertToMCPError(
        error,
        MCPErrorCode.COMPLETIONS_FAILED,
        `Failed to get completions for ${methodName}.${argName}`,
        id,
        { methodName, argName, value }
      )
      
      this.logger.error('Error getting completions', { 
        id, 
        methodName, 
        argName, 
        error: mcpError.toJSON() 
      })
      throw mcpError
    }
  }

  /**
   * Get the state of a specific server
   * 
   * @param id Server identifier
   * @returns Server state or undefined if not found
   */
  getServerState(id: string): ServerState | undefined {
    const server = this.servers.get(id)
    if (!server) {
      return undefined
    }
    
    return server.getState()
  }

  /**
   * Get all server states
   * 
   * @returns Map of server identifiers to states
   */
  getAllServerStates(): Map<string, ServerState> {
    const states = new Map<string, ServerState>()
    
    for (const [id, server] of this.servers) {
      states.set(id, server.getState())
    }
    
    return states
  }

  /**
   * Get a server instance by ID
   * 
   * @param id Server identifier
   * @returns Server instance or undefined if not found
   */
  getServer(id: string): MCPServerImpl | undefined {
    return this.servers.get(id)
  }

  /**
   * Get all server IDs
   * 
   * @returns Array of server identifiers
   */
  getServerIds(): string[] {
    return Array.from(this.servers.keys())
  }

  /**
   * Check the health of all servers
   * 
   * @returns Map of server identifiers to health status
   */
  async checkServerHealth(): Promise<Map<string, boolean>> {
    this.logger.info('Checking health of all servers')
    
    const healthStatus = new Map<string, boolean>()
    const healthPromises: Promise<void>[] = []
    
    // Create parallel promises for each server to improve performance
    for (const [id, server] of this.servers) {
      if (server.getConfig().disabled) {
        healthStatus.set(id, false)
        continue
      }
      
      // Use the new dedicated health check method
      const healthPromise = server.checkHealth()
        .then((isHealthy) => {
          healthStatus.set(id, isHealthy)
        })
        .catch(() => {
          healthStatus.set(id, false)
        })
        
      healthPromises.push(healthPromise)
    }
    
    // Wait for all health checks to complete
    await Promise.all(healthPromises)
    
    return healthStatus
  }
  
  /**
   * Get detailed health metrics for all servers
   * 
   * @returns Map of server identifiers to health metrics
   */
  getHealthMetrics(): Map<string, any> {
    this.logger.info('Getting health metrics for all servers')
    
    const healthMetrics = new Map<string, any>()
    
    for (const [id, server] of this.servers) {
      const state = server.getState()
      healthMetrics.set(id, {
        status: state.status,
        health: state.health || {
          isHealthy: state.status === 'connected',
          checkCount: 0,
          lastCheckTime: 0,
          failureCount: 0,
          consecutiveFailures: 0,
          checkHistory: []
        }
      })
    }
    
    return healthMetrics
  }

  /**
   * Start periodic health checks
   * 
   * @param intervalMs Interval between health checks in milliseconds
   */
  private startHealthChecks(intervalMs = 30000) {
    // Clear any existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    // Set up new interval
    // Use a different approach to avoid the Symbol.dispose TypeScript issue
    const interval = setInterval(async () => {
      try {
        this.logger.debug('Running scheduled health check')
        const healthStatus = await this.checkServerHealth()
        
        // Log any unhealthy servers (with more details)
        for (const [id, healthy] of healthStatus) {
          if (!healthy) {
            // Get detailed health metrics for better reporting
            const metrics = this.getHealthMetrics().get(id)
            this.logger.warn('Server health check failed', { 
              id,
              status: metrics?.status,
              checkCount: metrics?.health?.checkCount,
              failureCount: metrics?.health?.failureCount,
              consecutiveFailures: metrics?.health?.consecutiveFailures,
              lastError: metrics?.health?.lastError
            })
          }
        }
      } catch (error) {
        this.logger.error('Error during health check', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }, intervalMs)
    
    // Store the interval ID
    this.healthCheckInterval = interval
  }

  /**
   * Clean up all servers and stop health checks
   */
  async cleanup() {
    this.logger.info('Cleaning up all servers')
    
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }
    
    // Stop all servers in parallel
    const stopPromises = Array.from(this.servers.values())
      .map(server => {
        return server.stop().catch(error => {
          this.logger.error('Error stopping server during cleanup', {
            id: server.getId(),
            error: error instanceof Error ? error.message : String(error)
          })
        })
      })

    await Promise.all(stopPromises)
    this.servers.clear()
    
    this.logger.info('All servers cleaned up')
  }
}
