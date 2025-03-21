import { createLogger } from '@mandrake/utils'
import { LogBuffer } from '../logger'
import type { ServerConfig, ServerState, HealthMetrics } from '../types'
import { MCPError, ServerDisabledError } from '../errors'
import { ServerHealthManager } from './health'
import type { ProxyManager } from './proxy-manager'
import type { ProxyMetrics, ProxyState } from '../proxy'
import { ConfigManager } from '../config'
import type { ValidatedServerConfig } from '../config'

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
  private proxyManager?: ProxyManager
  private logger = createLogger('mcp').child({ 
    meta: { component: 'lifecycle', id: this.id }
  })
  
  constructor(
    private id: string,
    private config: ValidatedServerConfig
  ) {
    // Initialize with enhanced options
    this.logBuffer = new LogBuffer({
      includeTimestamp: true,
      logToConsole: false,  // We'll use our logger for console output
      maxLogs: 150,         // Increased log capacity
      maxLogLength: 1500    // Longer max log length
    })
    
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
   * Set the proxy manager for this server lifecycle
   * This allows us to include proxy metrics in the server state
   */
  setProxyManager(proxyManager: ProxyManager): void {
    this.proxyManager = proxyManager
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
   * Get the current server state with status, health metrics, and proxy information
   */
  getState(hasClient: boolean): ServerState & { status: string } {
    // Get logs as strings (with timestamps)
    const logs = this.logBuffer.getLogs(true) as string[];
    
    // If we have a proxy manager, get proxy metrics
    let proxyState = undefined;
    
    if (this.proxyManager) {
      const proxyMetrics = this.proxyManager.getProxyMetrics();
      const isHealthy = this.proxyManager.isProxyHealthy();
      const lastStateChange = this.proxyManager.getLastStateChange();
      const lastError = this.proxyManager.getLastError();
      
      proxyState = {
        state: proxyMetrics?.state || 'unknown',
        isHealthy,
        metrics: proxyMetrics,
        lastStateChange: lastStateChange && {
          oldState: lastStateChange.oldState,
          newState: lastStateChange.newState,
          time: lastStateChange.time.toISOString()
        },
        lastError: lastError && {
          message: lastError.message,
          time: new Date().toISOString() // We don't have the time from the error
        }
      };
    }
    
    return {
      ...this.state,
      logs,
      status: this.getStatus(hasClient),
      health: this.healthManager?.getMetrics(),
      proxy: proxyState
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
  getConfig(): ValidatedServerConfig {
    return { ...this.config }
  }

  /**
   * Update the server configuration
   */
  updateConfig(updates: Partial<ValidatedServerConfig>) {
    this.config = ConfigManager.update(this.config, updates)
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
    
    this.logBuffer.info('Connected successfully', { id: this.id })
    this.logger.debug('Server started successfully', { id: this.id })
    
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
    
    const errorMetadata = {
      id: this.id,
      error: errorMsg,
      retryCount: this.state.retryCount
    }
    
    this.logBuffer.error(`Start error: ${errorMsg}`, errorMetadata)
    this.logger.error('Failed to start server', errorMetadata)
    
    // Check if should retry
    if (this.state.retryCount >= 3) {
      const msg = 'Max retry attempts reached'
      this.logBuffer.warn(msg, { id: this.id })
      this.logger.warn(msg, { id: this.id })
      return false // Don't retry
    }
    
    // Implement retry with exponential backoff
    const delay = Math.pow(2, this.state.retryCount) * 1000 // Exponential backoff in ms
    this.state.retryCount++
    
    const retryMetadata = { 
      id: this.id, 
      delay, 
      attempt: this.state.retryCount 
    }
    
    this.logBuffer.info(`Retrying in ${delay}ms (attempt ${this.state.retryCount}/3)`, retryMetadata)
    this.logger.info('Scheduling retry', retryMetadata)
    
    // Wait for backoff delay
    await new Promise(resolve => setTimeout(resolve, delay))
    return true // Should retry
  }

  /**
   * Log server stop event
   */
  logServerStopped(): void {
    this.logBuffer.info('Server stopped', { id: this.id })
    this.logger.debug('Server stopped successfully', { id: this.id })
    
    // Stop health monitoring
    this.stopHealthMonitoring()
  }

  /**
   * Log server stop error
   */
  logServerStopError(error: any): void {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const msg = `Error stopping server: ${errorMsg}`
    
    const metadata = {
      id: this.id,
      error: errorMsg
    }
    
    this.logger.error('Failed to stop server', metadata)
    
    this.state.error = msg
    this.logBuffer.error(this.state.error, metadata)
  }

  /**
   * Log tool invocation
   */
  logToolInvocation(method: string, args: Record<string, any>): void {
    const metadata = { id: this.id, method, args }
    this.logger.debug('Invoking tool', metadata)
    this.logBuffer.info(`Invoking tool: ${method}`, metadata)
  }

  /**
   * Log tool invocation success
   */
  logToolInvocationSuccess(method: string): void {
    const metadata = { id: this.id, method }
    this.logBuffer.info(`Tool call successful: ${method}`, metadata)
    this.logger.debug('Tool invocation successful', metadata)
  }

  /**
   * Log tool invocation error
   */
  logToolInvocationError(method: string, error: MCPError): void {
    const metadata = {
      id: this.id,
      method,
      error: error.toJSON()
    }
    
    this.logBuffer.error(`Tool error: ${error.message}`, metadata)
    this.logger.error('Tool invocation failed', metadata)
  }

  /**
   * Log general operation
   * 
   * @param message The log message
   * @param level Optional log level
   * @param metadata Optional metadata
   */
  log(message: string, level: 'debug' | 'info' | 'warning' | 'error' = 'info', metadata?: Record<string, any>): void {
    switch(level) {
      case 'debug':
        this.logBuffer.debug(message, metadata)
        break
      case 'info':
        this.logBuffer.info(message, metadata)
        break
      case 'warning':
        this.logBuffer.warn(message, metadata)
        break
      case 'error':
        this.logBuffer.error(message, metadata)
        break
      default:
        this.logBuffer.info(message, metadata)
    }
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