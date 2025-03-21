import type { ManagedService, ServiceStatus } from '../types';
import { MCPManager, MCPServerImpl } from '@mandrake/mcp';
import { type Logger, ConsoleLogger } from '@mandrake/utils';
import type { ToolConfig } from '@mandrake/utils';

/**
 * Adapter for MCPManager that implements the ManagedService interface
 */
export class MCPManagerAdapter implements ManagedService {
  private initialized = false;
  private logger: Logger;
  private configId: string;
  private isSystem: boolean;
  private workspaceId?: string;
  
  /**
   * Create a new MCPManagerAdapter
   * 
   * @param mcpManager The MCPManager instance to adapt
   * @param toolConfig The concrete tool configuration to use
   * @param configId Identifier for this config set
   * @param options Optional configuration
   */
  constructor(
    private readonly mcpManager: MCPManager,
    private readonly toolConfig: ToolConfig,
    configId: string,
    options?: { 
      logger?: Logger;
      isSystem?: boolean; 
      workspaceId?: string;
    }
  ) {
    this.logger = options?.logger || new ConsoleLogger({
      meta: { 
        service: 'MCPManagerAdapter',
        configId,
        isSystem: options?.isSystem || false,
        workspaceId: options?.workspaceId
      }
    });
    
    this.configId = configId;
    this.isSystem = options?.isSystem || false;
    this.workspaceId = options?.workspaceId;
  }
  
  /**
   * Initialize the MCPManager by starting servers based on the provided tool configuration
   */
  async init(): Promise<void> {
    if (this.initialized) {
      this.logger.debug('MCPManager already initialized');
      return;
    }
    
    this.logger.info('Initializing MCPManager', {
      configId: this.configId,
      isSystem: this.isSystem,
      workspaceId: this.workspaceId
    });

    try {
      // Start servers for each tool configuration
      const serverStartPromises = [];
      
      for (const [toolName, config] of Object.entries(this.toolConfig)) {
        if (!config || config.disabled) {
          this.logger.debug('Skipping disabled server', { toolName });
          continue;
        }
        
        this.logger.debug('Starting server for tool', { 
          toolName, 
          configId: this.configId,
          isSystem: this.isSystem,
          workspaceId: this.workspaceId
        });
        
        // Start each server and handle errors individually
        const startPromise = this.mcpManager.startServer(toolName, config)
          .then(() => {
            this.logger.debug('Server started successfully', { toolName });
            return { toolName, success: true };
          })
          .catch(error => {
            this.logger.error('Failed to start server for tool', {
              toolName,
              error: error instanceof Error ? error.message : String(error)
            });
            return { toolName, success: false, error };
          });
        
        serverStartPromises.push(startPromise);
      }
      
      // Wait for all server starts to complete
      const results = await Promise.all(serverStartPromises);
      
      // Check if any servers failed to start
      const failedServers = results.filter(r => !r.success);
      if (failedServers.length > 0) {
        this.logger.warn('Some servers failed to start', { 
          failedCount: failedServers.length,
          failedTools: failedServers.map(f => f.toolName)
        });
      }
      
      // Even if some servers failed to start, consider initialization successful
      this.initialized = true;
      this.logger.info('MCPManager initialized successfully', {
        configId: this.configId,
        isSystem: this.isSystem,
        workspaceId: this.workspaceId,
        serverCount: results.filter(r => r.success).length,
        failedCount: failedServers.length
      });
    } catch (error) {
      this.logger.error('Failed to initialize MCPManager', {
        error: error instanceof Error ? error.message : String(error),
        configId: this.configId,
        isSystem: this.isSystem,
        workspaceId: this.workspaceId
      });
      throw new Error(`MCPManager initialization failed: ${error}`);
    }
  }
  
  /**
   * Check if the MCPManager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Clean up MCPManager resources
   * Stops all servers managed by this MCPManager
   */
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      this.logger.debug('MCPManager not initialized, nothing to clean up');
      return;
    }
    
    this.logger.info('Cleaning up MCPManager', {
      configId: this.configId,
      isSystem: this.isSystem,
      workspaceId: this.workspaceId
    });
    
    // Get all server IDs
    const servers = this.getServers();
    
    // Track errors to collect them but continue cleanup for all servers
    const errors: Error[] = [];
    
    // Stop all servers in parallel
    const stopPromises = servers.map(server => {
      const serverId = server.getId();
      return this.mcpManager.stopServer(serverId)
        .then(() => {
          this.logger.debug('Server stopped successfully', { serverId });
          return { serverId, success: true };
        })
        .catch(error => {
          // Log error but continue with other servers
          this.logger.error('Error stopping server during cleanup', {
            serverId,
            error: error instanceof Error ? error.message : String(error)
          });
          errors.push(error instanceof Error ? error : new Error(String(error)));
          return { serverId, success: false, error };
        });
    });
    
    // Wait for all servers to be stopped
    const results = await Promise.all(stopPromises);
    
    // Check for any cleanup errors
    if (errors.length > 0) {
      this.logger.warn(`${errors.length} servers failed to stop cleanly`, {
        errorCount: errors.length,
        failedServers: results.filter(r => !r.success).map(r => r.serverId)
      });
    }
    
    this.initialized = false;
    this.logger.info('MCPManager cleaned up successfully', {
      configId: this.configId,
      isSystem: this.isSystem,
      workspaceId: this.workspaceId,
      successCount: results.filter(r => r.success).length,
      failedCount: errors.length
    });
    
    // If there were errors during cleanup but we've tried to clean up everything,
    // we don't throw to prevent blocking other service cleanup
  }
  
  /**
   * Get the status of the MCPManager
   * Includes details on all managed servers
   */
  getStatus(): ServiceStatus {
    // Get servers
    const servers = this.getServers();
    
    // Build server status map
    const serverStatuses: Record<string, any> = {};
    
    for (const server of servers) {
      const serverId = server.getId();
      try {
        // Get server state
        const state = server.getState();
        
        // Server is considered running if its status is 'running' or 'connected'
        // In our test environment, servers often show as 'connected' but are functional
        const isRunning = state?.status === 'running' || state?.status === 'connected';
        
        // Server is healthy if it's running and has no consecutive failures
        const hasNoFailures = !state?.health || state.health.consecutiveFailures === 0;
        const isHealthy = isRunning && hasNoFailures;
        
        // Add status to the map
        serverStatuses[serverId] = {
          running: isRunning, // Use our broader definition of running
          healthy: isHealthy,
          status: state?.status || 'unknown',
          error: state?.error || null,
          retryCount: state?.retryCount || 0,
          healthMetrics: state?.health ? {
            lastCheckTime: state.health.lastCheckTime,
            consecutiveFailures: state.health.consecutiveFailures,
            checkCount: state.health.checkCount,
            failureCount: state.health.failureCount
          } : null
        };
      } catch (error) {
        this.logger.error('Error getting server status', {
          serverId,
          error: error instanceof Error ? error.message : String(error)
        });
        serverStatuses[serverId] = {
          running: false,
          healthy: false,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
    
    // Overall status is based on whether all servers are running and healthy
    const serverEntries = Object.values(serverStatuses);
    
    // All servers are running when all have running status
    const allServersRunning = serverEntries.length > 0 && 
                              serverEntries.every(status => status.running);
    
    // All servers are healthy when all have healthy status (running + no failures)
    const allServersHealthy = serverEntries.length > 0 && 
                              serverEntries.every(status => status.healthy);
    
    // Extended health metrics
    let allRunningButSomeUnhealthy = false;
    if (serverEntries.length > 0) {
      const someUnhealthy = serverEntries.some(status => !status.healthy);
      allRunningButSomeUnhealthy = allServersRunning && someUnhealthy;
    }
    
    // Return service status with health information
    return {
      isHealthy: this.initialized && allServersHealthy,
      statusCode: this.getStatusCode(allServersHealthy, allRunningButSomeUnhealthy, serverEntries.length),
      message: this.getStatusMessage(allServersHealthy, allRunningButSomeUnhealthy, serverEntries.length),
      details: {
        initialized: this.initialized,
        configId: this.configId,
        isSystem: this.isSystem,
        workspaceId: this.workspaceId,
        serverCount: servers.length,
        servers: serverStatuses,
        healthSummary: {
          totalServers: servers.length,
          healthyServers: serverEntries.filter(s => s.healthy).length,
          runningServers: serverEntries.filter(s => s.running).length,
          unhealthyServers: serverEntries.filter(s => !s.healthy).length
        }
      }
    };
  }
  
  /**
   * Get the underlying MCPManager
   */
  getManager(): MCPManager {
    return this.mcpManager;
  }
  
  /**
   * Helper method to get all servers from the MCPManager
   * @private
   */
  private getServers(): MCPServerImpl[] {
    try {
      // Get all server IDs from the MCPManager
      const serverIds = this.mcpManager.getServerIds();
      if (!serverIds || serverIds.size === 0) {
        return [];
      }
      
      // Collect all servers
      const servers: MCPServerImpl[] = [];
      serverIds.forEach(id => {
        try {
          const server = this.mcpManager.getServer(id);
          if (server) {
            servers.push(server);
          }
        } catch (error) {
          this.logger.warn(`Failed to get server with ID ${id}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });
      
      return servers;
    } catch (error) {
      this.logger.error('Error getting servers', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }
  
  /**
   * Helper to generate status codes based on health state
   * @private
   */
  private getStatusCode(allHealthy: boolean, runningButUnhealthy: boolean, serverCount: number): number {
    if (!this.initialized) return 503; // Service Unavailable
    if (serverCount === 0) return 204; // No Content (no servers to monitor)
    if (allHealthy) return 200; // OK
    if (runningButUnhealthy) return 206; // Partial Content (all running but some unhealthy)
    return 500; // Internal Server Error (some not running)
  }
  
  /**
   * Helper to generate human-readable status messages
   * @private
   */
  private getStatusMessage(allHealthy: boolean, runningButUnhealthy: boolean, serverCount: number): string {
    if (!this.initialized) return 'MCP Manager not initialized';
    if (serverCount === 0) return 'No servers registered';
    if (allHealthy) return 'All servers healthy';
    if (runningButUnhealthy) return 'All servers running but some are reporting health issues';
    return 'Some servers are not running or healthy';
  }
}