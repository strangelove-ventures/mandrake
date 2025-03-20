import { createLogger } from '@mandrake/utils'
import { LogBuffer } from '../logger'
import type { ServerConfig, ServerState, HealthMetrics } from '../types'
import { MCPError, ServerDisabledError } from '../errors'
import { ServerHealthManager } from './health'

/**
 * Handles server lifecycle operations
 * 
 * This class manages the lifecycle operations of an MCP server:
 * - Server initialization
 * - Start/stop lifecycle
 * - Retry logic
 * - State tracking
 * - Log management
 */
export class ServerLifecycle {
  private logBuffer: LogBuffer
  private state: ServerState
  private healthManager?: ServerHealthManager
  private logger = createLogger('mcp').child({ 
    meta: { component: 'lifecycle', id: this.id }
  })
  
  constructor(
    private id: string,
    private config: ServerConfig
  ) {
    this.logBuffer = new LogBuffer()
    this.state = {
      retryCount: 0,
      logs: []
    }
  }
  
  /**
   * Initialize the health manager with a reference to the server
   * This must be called after the server is fully constructed
   */
  initHealthManager(server: any): void {
    this.healthManager = new ServerHealthManager(this.id, server, this.config)
  }
  
  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    if (this.healthManager) {
      this.healthManager.startMonitoring()
    }
  }
  
  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthManager) {
      this.healthManager.stopMonitoring()
    }
  }

  getId(): string {
    return this.id
  }

  /**
   * Get the current server state with status and health metrics
   */
  getState(hasClient: boolean): ServerState & { status: string } {
    return {
      ...this.state,
      logs: this.logBuffer.getLogs(),
      status: this.getStatus(hasClient),
      health: this.healthManager?.getMetrics()
    }
  }
  
  /**
   * Run a manual health check
   * Returns true if healthy, false otherwise
   */
  async checkHealth(): Promise<boolean> {
    if (this.healthManager) {
      return await this.healthManager.checkHealth()
    }
    return false
  }

  /**
   * Get the server configuration
   */
  getConfig(): ServerConfig {
    return { ...this.config }
  }

  /**
   * Update the server configuration
   */
  updateConfig(config: Partial<ServerConfig>) {
    this.config = { ...this.config, ...config }
    this.logger.info('Updated server configuration', { id: this.id, config: this.config })
  }

  /**
   * Check if server is disabled
   */
  isDisabled(): boolean {
    return !!this.config.disabled
  }

  /**
   * Verify server is enabled or throw error
   */
  verifyEnabled(): void {
    if (this.isDisabled()) {
      throw new ServerDisabledError(this.id)
    }
  }

  /**
   * Handle successful connection
   */
  handleConnectionSuccess(): void {
    this.state.retryCount = 0
    this.state.error = undefined
    this.state.lastRetryTimestamp = undefined
    
    this.logBuffer.append('Connected successfully')
    this.logger.info('Server started successfully', { id: this.id })
    
    // Start health monitoring
    this.startHealthMonitoring()
  }

  /**
   * Handle connection error with retry logic
   */
  async handleConnectionError(error: any): Promise<boolean> {
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    this.state.error = errorMsg
    this.state.lastRetryTimestamp = Date.now()
    this.logBuffer.append(`Start error: ${errorMsg}`)
    
    this.logger.error('Failed to start server', {
      id: this.id,
      error: errorMsg,
      retryCount: this.state.retryCount
    })
    
    // Check if should retry
    if (this.state.retryCount >= 3) {
      const msg = 'Max retry attempts reached'
      this.logBuffer.append(msg)
      this.logger.warn(msg, { id: this.id })
      return false // Don't retry
    }
    
    // Implement retry with exponential backoff
    const delay = Math.pow(2, this.state.retryCount) * 1000 // Exponential backoff in ms
    this.state.retryCount++
    
    this.logBuffer.append(`Retrying in ${delay}ms (attempt ${this.state.retryCount}/3)`)
    this.logger.info('Scheduling retry', { 
      id: this.id, 
      delay, 
      attempt: this.state.retryCount 
    })
    
    // Wait for backoff delay
    await new Promise(resolve => setTimeout(resolve, delay))
    return true // Should retry
  }

  /**
   * Log server stop event
   */
  logServerStopped(): void {
    this.logBuffer.append('Server stopped')
    this.logger.info('Server stopped successfully', { id: this.id })
    
    // Stop health monitoring
    this.stopHealthMonitoring()
  }

  /**
   * Log server stop error
   */
  logServerStopError(error: any): void {
    const msg = `Error stopping server: ${(error as Error).message}`
    this.logger.error('Failed to stop server', {
      id: this.id,
      error: error instanceof Error ? error.message : String(error)
    })
    
    this.state.error = msg
    this.logBuffer.append(this.state.error)
  }

  /**
   * Log tool invocation
   */
  logToolInvocation(method: string, args: Record<string, any>): void {
    this.logger.info('Invoking tool', { id: this.id, method, args })
    this.logBuffer.append(`Invoking tool: ${method}`)
  }

  /**
   * Log tool invocation success
   */
  logToolInvocationSuccess(method: string): void {
    this.logBuffer.append(`Tool call successful: ${method}`)
    this.logger.info('Tool invocation successful', { id: this.id, method })
  }

  /**
   * Log tool invocation error
   */
  logToolInvocationError(method: string, error: MCPError): void {
    this.logBuffer.append(`Tool error: ${error.message}`)
    
    this.logger.error('Tool invocation failed', {
      id: this.id,
      method,
      error: error.toJSON()
    })
  }

  /**
   * Log general operation
   */
  log(message: string): void {
    this.logBuffer.append(message)
  }

  /**
   * Determine the current server status
   */
  private getStatus(hasClient: boolean): string {
    if (this.config.disabled) {
      return 'disabled'
    }
    
    if (!hasClient) {
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
}