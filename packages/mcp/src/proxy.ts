import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { createLogger } from '@mandrake/utils'
import { MCPError, MCPErrorCode } from './errors'

/**
 * Enum for proxy connection state
 */
export enum ProxyState {
  CONNECTED = 'connected',     // Proxy is connected and forwarding messages
  DISCONNECTED = 'disconnected', // Proxy is disconnected on both sides
  CLOSING = 'closing',         // Proxy is in the process of shutting down
  CLOSED = 'closed',           // Proxy is fully closed
  ERROR = 'error'              // Proxy is in an error state
}

/**
 * Proxy statistics and metrics
 */
export interface ProxyMetrics {
  // Connection metrics
  state: ProxyState
  clientConnected: boolean
  serverConnected: boolean
  
  // Message metrics
  messagesSent: {
    toClient: number
    toServer: number
  }
  messagesReceived: {
    fromClient: number
    fromServer: number
  }
  
  // Error metrics
  errors: {
    client: number
    server: number
  }
  
  // Reconnection metrics (for backward compatibility)
  reconnectionAttempts?: number
  
  // Health metrics
  isHealthy: boolean
  lastError?: {
    time: Date
    message: string
    source: 'client' | 'server' | 'proxy'
  }
}

/**
 * Configuration options for the proxy
 */
export interface ProxyOptions {
  // Custom error handler
  onError?: (error: Error, source: 'client' | 'server' | 'proxy') => void
  
  // Custom state change handler
  onStateChange?: (oldState: ProxyState, newState: ProxyState, metrics: ProxyMetrics) => void
  
  // Whether to automatically close the other transport when one closes
  autoCloseOnDisconnect: boolean
  
  // Whether to enable reconnection
  enableReconnection?: boolean
  
  // Factory function to create a new client transport
  createClientTransport?: () => Promise<Transport>
  
  // Factory function to create a new server transport
  createServerTransport?: () => Promise<Transport>
  
  // Server configuration for reconnection
  serverConfig?: any
}

// Default proxy options
const DEFAULT_PROXY_OPTIONS: ProxyOptions = {
  autoCloseOnDisconnect: true
}

/**
 * Error class for proxy-related errors
 */
export class ProxyError extends MCPError {
  constructor(
    message: string,
    originalError?: Error, 
    metadata?: Record<string, any>
  ) {
    super(
      message,
      MCPErrorCode.PROXY_ERROR,
      {
        cause: originalError,
        details: metadata
      }
    )
  }
}

/**
 * MCPProxy provides bidirectional communication between client and server transports
 * 
 * This implementation:
 * - Forwards messages between client and server transports
 * - Handles transport disconnection
 * - Provides basic error handling
 * - Supports metrics for monitoring
 */
export class MCPProxy {
  private clientTransportClosed = false
  private serverTransportClosed = false
  
  private metrics: ProxyMetrics = {
    state: ProxyState.DISCONNECTED,
    clientConnected: false,
    serverConnected: false,
    messagesSent: {
      toClient: 0,
      toServer: 0
    },
    messagesReceived: {
      fromClient: 0,
      fromServer: 0
    },
    errors: {
      client: 0,
      server: 0
    },
    reconnectionAttempts: 0,
    isHealthy: false
  }
  
  private options: ProxyOptions
  private logger = createLogger('mcp').child({
    meta: { component: 'proxy' }
  })
  
  /**
   * Create a new MCPProxy instance
   * 
   * @param clientTransport Transport connected to the client (consumer)
   * @param serverTransport Transport connected to the MCP server (provider)
   * @param options Configuration options for the proxy
   */
  constructor(
    private clientTransport: Transport,
    private serverTransport: Transport,
    options: Partial<ProxyOptions> = {}
  ) {
    this.options = { ...DEFAULT_PROXY_OPTIONS, ...options }
    this.setupProxy()
  }

  /**
   * Set up the bidirectional proxy between transports
   */
  private setupProxy() {
    // Set up initial state
    this.updateState(ProxyState.CONNECTED)
    this.metrics.clientConnected = true
    this.metrics.serverConnected = true
    this.metrics.isHealthy = true
    
    // Check if we're using the same transport object for both sides
    const isSameTransport = this.clientTransport === this.serverTransport;
    
    if (isSameTransport) {
      this.logger.debug('Using same transport object for both client and server sides');
      
      // For shared transport, only forward notifications and implement onclose
      this.setupSharedTransportHandlers();
    } else {
      // With separate transports, set up bidirectional forwarding
      this.setupClientTransportHandlers();
      this.setupServerTransportHandlers();
    }
    
    this.logger.debug('Proxy setup completed between client and server transports')
  }
  
  /**
   * Set up handlers for a shared transport (when client and server use the same transport)
   */
  private setupSharedTransportHandlers() {
    // For shared transport, we don't need to forward messages
    // We just need to set up an onclose handler
    
    // Handle transport closure
    this.clientTransport.onclose = () => {
      this.clientTransportClosed = true;
      this.serverTransportClosed = true;
      this.metrics.clientConnected = false;
      this.metrics.serverConnected = false;
      
      this.logger.debug('Shared transport closed (affects both client and server sides)');
      
      this.updateState(ProxyState.DISCONNECTED);
    };
    
    // Set up error handler
    this.clientTransport.onerror = (error) => {
      this.handleClientError(error);
      this.handleServerError(error);
    };
    
    this.logger.debug('Shared transport handlers set up');
  }
  
  /**
   * Set up event handlers for the client transport
   */
  private setupClientTransportHandlers() {
    // Handle messages from client to server
    this.clientTransport.onmessage = async (message) => {
      this.metrics.messagesReceived.fromClient++
      
      // Forward the message to the server
      try {
        await this.serverTransport.send(message)
        this.metrics.messagesSent.toServer++
      } catch (error) {
        this.handleServerError(error instanceof Error ? error : new Error(String(error)))
      }
    }
    
    // Handle client disconnection
    this.clientTransport.onclose = () => {
      this.clientTransportClosed = true
      this.metrics.clientConnected = false
      
      this.logger.info('Client transport closed')
      
      if (this.serverTransportClosed) {
        // Both sides closed, update state
        this.updateState(ProxyState.DISCONNECTED)
        return
      }
      
      if (this.options.autoCloseOnDisconnect) {
        // Auto close the server side
        this.logger.info('Automatically closing server transport due to client disconnect')
        this.serverTransport.close().catch(this.handleServerError.bind(this))
      }
    }
    
    // Set up error handler
    this.clientTransport.onerror = this.handleClientError.bind(this)
    
    this.logger.info('Client transport handlers set up')
  }
  
  /**
   * Set up event handlers for the server transport
   */
  private setupServerTransportHandlers() {
    // Handle messages from server to client
    this.serverTransport.onmessage = async (message) => {
      this.metrics.messagesReceived.fromServer++
      
      // Forward the message to the client
      try {
        await this.clientTransport.send(message)
        this.metrics.messagesSent.toClient++
      } catch (error) {
        this.handleClientError(error instanceof Error ? error : new Error(String(error)))
      }
    }
    
    // Handle server disconnection
    this.serverTransport.onclose = () => {
      this.serverTransportClosed = true
      this.metrics.serverConnected = false
      
      this.logger.info('Server transport closed')
      
      if (this.clientTransportClosed) {
        // Both sides closed, update state
        this.updateState(ProxyState.DISCONNECTED)
        return
      }
      
      if (this.options.autoCloseOnDisconnect) {
        // Auto close the client side
        this.logger.info('Automatically closing client transport due to server disconnect')
        this.clientTransport.close().catch(this.handleClientError.bind(this))
      }
    }
    
    // Set up error handler
    this.serverTransport.onerror = this.handleServerError.bind(this)
    
    this.logger.info('Server transport handlers set up')
  }

  /**
   * Update the proxy's state and trigger callbacks
   */
  private updateState(newState: ProxyState) {
    const oldState = this.metrics.state
    
    if (oldState === newState) {
      return
    }
    
    this.logger.debug(`Proxy state changed from ${oldState} to ${newState}`)
    
    this.metrics.state = newState
    
    // Update health status
    this.metrics.isHealthy = (this.metrics.clientConnected && this.metrics.serverConnected);
    
    // Call the state change handler if provided
    if (this.options.onStateChange) {
      try {
        this.options.onStateChange(oldState, newState, { ...this.metrics })
      } catch (error) {
        this.logger.error('Error in onStateChange callback', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }

  /**
   * Close both transport connections
   */
  async close() {
    this.logger.debug('Closing proxy connections')
    
    // Update state to closing
    this.updateState(ProxyState.CLOSING)
    
    try {
      // Check if we're using the same transport for both sides
      const isSameTransport = this.clientTransport === this.serverTransport;
      
      if (isSameTransport) {
        // If using the same transport, just close it once
        this.logger.debug('Closing shared transport (used for both client and server)');
        
        if (!this.clientTransportClosed) {
          this.clientTransportClosed = true;
          this.serverTransportClosed = true;
          this.metrics.clientConnected = false;
          this.metrics.serverConnected = false;
          await this.clientTransport.close();
        }
      } else {
        // Close both transports if not already closed
        const promises: Promise<void>[] = [];
        
        if (!this.serverTransportClosed) {
          this.serverTransportClosed = true;
          this.metrics.serverConnected = false;
          promises.push(this.serverTransport.close());
        }
        
        if (!this.clientTransportClosed) {
          this.clientTransportClosed = true;
          this.metrics.clientConnected = false;
          promises.push(this.clientTransport.close());
        }
        
        // Wait for both to close
        if (promises.length > 0) {
          await Promise.all(promises);
        }
      }
      
      // Update state to closed
      this.updateState(ProxyState.CLOSED)
      
      this.logger.debug('Proxy connections closed successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      this.logger.error('Error closing proxy connections', { 
        error: errorMessage
      })
      
      // Update state to error
      this.updateState(ProxyState.ERROR)
      
      // Trigger onError callback if provided
      if (this.options.onError) {
        try {
          this.options.onError(
            error instanceof Error ? error : new Error(String(error)),
            'proxy'
          )
        } catch (callbackError) {
          this.logger.error('Error in onError callback', {
            error: callbackError instanceof Error ? callbackError.message : String(callbackError)
          })
        }
      }
      
      throw new ProxyError('Failed to close proxy connections', 
        error instanceof Error ? error : undefined,
        { state: this.metrics.state }
      )
    }
  }
  
  /**
   * Check if the proxy is healthy
   */
  isHealthy(): boolean {
    return this.metrics.isHealthy
  }
  
  /**
   * Get the current proxy metrics
   */
  getMetrics(): ProxyMetrics {
    return { ...this.metrics }
  }

  /**
   * Handle errors from the client transport
   */
  private handleClientError(error: Error) {
    this.metrics.errors.client++
    
    // Update last error
    this.metrics.lastError = {
      time: new Date(),
      message: error.message,
      source: 'client'
    }
    
    this.logger.error('Error from client transport', {
      error: error.message,
      stack: error.stack
    })
    
    // Trigger onError callback if provided
    if (this.options.onError) {
      try {
        this.options.onError(error, 'client')
      } catch (callbackError) {
        this.logger.error('Error in onError callback', {
          error: callbackError instanceof Error ? callbackError.message : String(callbackError)
        })
      }
    }
  }

  /**
   * Handle errors from the server transport
   */
  private handleServerError(error: Error) {
    this.metrics.errors.server++
    
    // Update last error
    this.metrics.lastError = {
      time: new Date(),
      message: error.message,
      source: 'server'
    }
    
    this.logger.error('Error from server transport', {
      error: error.message,
      stack: error.stack
    })
    
    // Trigger onError callback if provided
    if (this.options.onError) {
      try {
        this.options.onError(error, 'server')
      } catch (callbackError) {
        this.logger.error('Error in onError callback', {
          error: callbackError instanceof Error ? callbackError.message : String(callbackError)
        })
      }
    }
  }
}