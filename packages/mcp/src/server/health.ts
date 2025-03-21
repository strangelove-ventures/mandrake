import { createLogger } from '@mandrake/utils'
import type { MCPServer } from '../types'
import { HealthCheckStrategy } from '../types'
import type { 
  HealthCheckConfig, 
  HealthMetrics,
  ServerConfig
} from '../types'
import { ConfigManager } from '../config'
import type { ValidatedServerConfig, ValidatedHealthCheckConfig } from '../config'

/**
 * Default health check history size
 */
const DEFAULT_HISTORY_SIZE = 10

/**
 * Default health check configuration
 */
const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  strategy: HealthCheckStrategy.TOOL_LISTING,
  intervalMs: 30000,
  timeoutMs: 5000,
  retries: 1
}

/**
 * Server health manager
 * 
 * Responsible for monitoring server health and maintaining health metrics.
 * Provides configurable health check strategies and detailed metrics.
 */
export class ServerHealthManager {
  private metrics: HealthMetrics
  private config: ValidatedHealthCheckConfig
  private checkInterval?: NodeJS.Timer
  private server: MCPServer
  private logger = createLogger('mcp').child({ 
    meta: { component: 'health', id: this.serverId }
  })
  
  constructor(
    private serverId: string,
    server: MCPServer,
    serverConfig: ValidatedServerConfig
  ) {
    this.server = server
    
    // Initialize with default metrics
    this.metrics = {
      isHealthy: false,
      lastCheckTime: 0,
      checkCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      checkHistory: []
    }
    
    // Use validated health check config
    this.config = serverConfig.healthCheck
    
    this.logger.debug('Health manager initialized', { 
      id: this.serverId,
      strategy: this.config.strategy 
    })
  }
  
  /**
   * Start health checks at the configured interval
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      this.stopMonitoring()
    }
    
    this.checkInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        this.logger.error('Error during health check', {
          id: this.serverId,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }, this.config.intervalMs)
    
    this.logger.debug('Started health monitoring', { 
      id: this.serverId,
      intervalMs: this.config.intervalMs 
    })
  }
  
  /**
   * Stop health checks
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = undefined
      this.logger.debug('Stopped health monitoring', { id: this.serverId })
    }
  }
  
  /**
   * Perform a health check immediately
   * Returns true if healthy, false otherwise
   */
  async checkHealth(): Promise<boolean> {
    await this.performHealthCheck()
    return this.metrics.isHealthy
  }
  
  /**
   * Get current health metrics
   */
  getMetrics(): HealthMetrics {
    return { ...this.metrics }
  }
  
  /**
   * Perform a health check using the configured strategy
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now()
    let success = false
    let error: string | undefined = undefined
    
    try {
      // Run strategy with timeout
      success = await this.runWithTimeout(
        this.executeStrategy(),
        this.config.timeoutMs || 5000
      )
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : String(err)
    }
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    // Update metrics
    this.updateMetrics(success, responseTime, error)
    
    // Log result
    this.logHealthCheckResult(success, responseTime, error)
  }
  
  /**
   * Execute the configured health check strategy
   */
  private async executeStrategy(): Promise<boolean> {
    // Check if server is disabled (disabled servers are always unhealthy)
    if (this.server.getConfig().disabled) {
      return false
    }
    
    switch (this.config.strategy) {
      case HealthCheckStrategy.TOOL_LISTING:
        // Try to list tools - this is the default strategy
        try {
          await this.server.listTools()
          return true
        } catch (error) {
          return false
        }
        
      case HealthCheckStrategy.SPECIFIC_TOOL:
        // Use a specific tool to check health
        if (!this.config.specificTool) {
          throw new Error('specificTool configuration required for SPECIFIC_TOOL strategy')
        }
        
        try {
          await this.server.invokeTool(
            this.config.specificTool.name, 
            this.config.specificTool.args
          )
          return true
        } catch (error) {
          return false
        }
        
      case HealthCheckStrategy.PING:
        // A lightweight ping implementation
        // Note: This would require implementing a ping method in the MCP protocol
        // For now, we'll fall back to tool listing
        try {
          await this.server.listTools()
          return true
        } catch (error) {
          return false
        }
        
      case HealthCheckStrategy.CUSTOM:
        // Use custom health check function
        if (!this.config.customCheck) {
          throw new Error('customCheck function required for CUSTOM strategy')
        }
        
        return await this.config.customCheck(this.server)
        
      default:
        // Default to tool listing
        try {
          await this.server.listTools()
          return true
        } catch (error) {
          return false
        }
    }
  }
  
  /**
   * Run a promise with a timeout
   */
  private async runWithTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Health check timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      
      promise
        .then((result) => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }
  
  /**
   * Update health metrics with latest check results
   */
  private updateMetrics(
    success: boolean, 
    responseTimeMs: number, 
    error?: string
  ): void {
    // Update basic metrics
    this.metrics.lastCheckTime = Date.now()
    this.metrics.responseTimeMs = responseTimeMs
    this.metrics.checkCount++
    
    // Update history (keeping limited size)
    this.metrics.checkHistory.unshift({
      timestamp: Date.now(),
      success,
      responseTimeMs,
      error
    })
    
    // Limit history size
    if (this.metrics.checkHistory.length > DEFAULT_HISTORY_SIZE) {
      this.metrics.checkHistory = this.metrics.checkHistory.slice(0, DEFAULT_HISTORY_SIZE)
    }
    
    if (success) {
      // Reset consecutive failures on success
      this.metrics.consecutiveFailures = 0
      this.metrics.isHealthy = true
      this.metrics.lastError = undefined
    } else {
      // Update failure metrics
      this.metrics.failureCount++
      this.metrics.consecutiveFailures++
      this.metrics.lastError = error
      
      // If we've exceeded retry count, mark as unhealthy
      if (this.metrics.consecutiveFailures > (this.config.retries || 1)) {
        this.metrics.isHealthy = false
      }
    }
  }
  
  /**
   * Log health check results
   */
  private logHealthCheckResult(
    success: boolean, 
    responseTimeMs: number, 
    error?: string
  ): void {
    if (success) {
      this.logger.debug('Health check successful', {
        id: this.serverId,
        responseTimeMs,
        strategy: this.config.strategy
      })
    } else {
      this.logger.warn('Health check failed', {
        id: this.serverId,
        responseTimeMs,
        error,
        consecutiveFailures: this.metrics.consecutiveFailures,
        strategy: this.config.strategy
      })
    }
  }
}