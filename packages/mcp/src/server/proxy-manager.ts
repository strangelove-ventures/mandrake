import { createLogger } from '@mandrake/utils'
import { MCPProxy, ProxyState } from '../proxy'
import type { ProxyOptions, ProxyMetrics } from '../proxy'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { ProxyError } from '../proxy'

/**
 * Manages proxy operations between client and server transports
 * 
 * This enhanced implementation adds:
 * - Better state tracking and metrics
 * - Support for reconnection configuration
 * - Health status reporting
 * - Detailed error handling
 */
export class ProxyManager {
  private proxy?: MCPProxy
  private logger = createLogger('mcp').child({ 
    meta: { component: 'proxy-manager', id: this.id }
  })
  private lastError?: Error
  private lastStateChange?: {
    oldState: ProxyState
    newState: ProxyState
    time: Date
  }
  
  constructor(
    private id: string
  ) {}

  /**
   * Create a proxy between two transports with optional configuration
   * 
   * @param clientTransport Transport connected to the client (consumer)
   * @param serverTransport Transport connected to the MCP server (provider)
   * @param options Configuration options for the proxy's behavior
   * @param serverConfig Optional server configuration for reconnection
   * @returns The created proxy instance
   */
  createProxy(
    clientTransport: Transport, 
    serverTransport: Transport,
    options: Partial<ProxyOptions> = {},
    serverConfig?: any,
    transportFactory?: any
  ): MCPProxy {
    // Default options with server ID in context
    const defaultOptions: Partial<ProxyOptions> = {
      // Set up state change logging
      onStateChange: (oldState, newState, metrics) => {
        this.lastStateChange = {
          oldState,
          newState,
          time: new Date()
        }
        
        this.logger.debug(`Proxy state changed from ${oldState} to ${newState}`, {
          id: this.id,
          metrics: {
            messagesSent: metrics.messagesSent,
            messagesReceived: metrics.messagesReceived,
            errors: metrics.errors,
            reconnectionAttempts: metrics.reconnectionAttempts
          }
        })
      },
      
      // Set up error callback
      onError: (error, source) => {
        this.lastError = error
        
        this.logger.error(`Proxy error from ${source}`, {
          id: this.id,
          error: error.message,
          stack: error.stack,
          source
        })
      }
    }
    
    // If we have a server config and transport factory, add createServerTransport to options
    if (serverConfig && transportFactory) {
      defaultOptions.serverConfig = serverConfig;
      defaultOptions.createServerTransport = async () => {
        this.logger.info('Creating new server transport for reconnection');
        return transportFactory.create(serverConfig);
      };
      
      // In a real implementation, you'd also create a client transport factory
      // but for now we'll just simulate it in the test
      defaultOptions.createClientTransport = async () => {
        this.logger.info('Simulating client transport reconnection (for tests)');
        return clientTransport;
      };
    }
    
    // Create proxy with merged options
    this.proxy = new MCPProxy(
      clientTransport, 
      serverTransport, 
      { ...defaultOptions, ...options }
    )
    
    this.logger.debug('Proxy created successfully', { id: this.id })
    
    return this.proxy
  }

  /**
   * Close the proxy connection
   */
  async closeProxy(): Promise<void> {
    if (this.proxy) {
      try {
        await this.proxy.close()
        this.logger.debug('Proxy closed successfully', { id: this.id })
        this.proxy = undefined
      } catch (error) {
        // Log and rethrow as ProxyError if not already one
        if (!(error instanceof ProxyError)) {
          const proxyError = new ProxyError(
            'Failed to close proxy', 
            error instanceof Error ? error : undefined
          )
          
          this.logger.error('Error closing proxy', { 
            id: this.id,
            error: error instanceof Error ? error.message : String(error)
          })
          
          throw proxyError
        }
        
        throw error
      }
    }
  }

  /**
   * Get the current proxy
   */
  getProxy(): MCPProxy | undefined {
    return this.proxy
  }
  
  /**
   * Check if the proxy is currently healthy
   * 
   * @returns True if the proxy exists and is healthy, false otherwise
   */
  isProxyHealthy(): boolean {
    return !!this.proxy && this.proxy.isHealthy()
  }
  
  /**
   * Get detailed metrics about the proxy
   * 
   * @returns Current proxy metrics or undefined if no proxy exists
   */
  getProxyMetrics(): ProxyMetrics | undefined {
    return this.proxy?.getMetrics()
  }
  
  /**
   * Get information about the last proxy error
   * 
   * @returns The last error that occurred or undefined if no error has occurred
   */
  getLastError(): Error | undefined {
    return this.lastError
  }
  
  /**
   * Get information about the last state change
   * 
   * @returns Details about the last state change or undefined if no state change has occurred
   */
  getLastStateChange(): {
    oldState: ProxyState
    newState: ProxyState
    time: Date
  } | undefined {
    return this.lastStateChange
  }
}