import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { createLogger } from '@mandrake/utils'

/**
 * MCPProxy provides bidirectional communication between client and server transports
 * 
 * This implementation is based on the MCP Inspector's mcpProxy.ts
 * It creates a clean communication channel between transports with proper error handling.
 */
export class MCPProxy {
  private transportToClientClosed = false
  private transportToServerClosed = false
  private logger = createLogger('mcp').child({
    meta: { component: 'proxy' }
  })
  
  /**
   * Create a new MCPProxy instance
   * 
   * @param transportToClient Transport connected to the client (consumer)
   * @param transportToServer Transport connected to the MCP server (provider)
   */
  constructor(
    private transportToClient: Transport,
    private transportToServer: Transport
  ) {
    this.setupProxy()
  }

  /**
   * Set up the bidirectional proxy between transports
   */
  private setupProxy() {
    // Handle messages from client to server
    this.transportToClient.onmessage = (message) => {
      this.transportToServer.send(message).catch(this.handleServerError.bind(this))
    }

    // Handle messages from server to client
    this.transportToServer.onmessage = (message) => {
      this.transportToClient.send(message).catch(this.handleClientError.bind(this))
    }

    // Handle client disconnection
    this.transportToClient.onclose = () => {
      if (this.transportToServerClosed) {
        return
      }

      this.transportToClientClosed = true
      this.logger.info('Client transport closed, closing server transport')
      this.transportToServer.close().catch(this.handleServerError.bind(this))
    }

    // Handle server disconnection
    this.transportToServer.onclose = () => {
      if (this.transportToClientClosed) {
        return
      }
      
      this.transportToServerClosed = true
      this.logger.info('Server transport closed, closing client transport')
      this.transportToClient.close().catch(this.handleClientError.bind(this))
    }

    // Set up error handlers
    this.transportToClient.onerror = this.handleClientError.bind(this)
    this.transportToServer.onerror = this.handleServerError.bind(this)
    
    this.logger.info('Proxy setup completed between client and server transports')
  }

  /**
   * Close both transport connections
   */
  async close() {
    this.logger.info('Closing proxy connections')
    
    try {
      // Close server transport if not already closed
      if (!this.transportToServerClosed) {
        this.transportToServerClosed = true
        await this.transportToServer.close()
      }
      
      // Close client transport if not already closed
      if (!this.transportToClientClosed) {
        this.transportToClientClosed = true
        await this.transportToClient.close()
      }
      
      this.logger.info('Proxy connections closed successfully')
    } catch (error) {
      this.logger.error('Error closing proxy connections', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      throw error
    }
  }

  /**
   * Handle errors from the client transport
   */
  private handleClientError(error: Error) {
    this.logger.error('Error from client transport', {
      error: error.message,
      stack: error.stack
    })
  }

  /**
   * Handle errors from the server transport
   */
  private handleServerError(error: Error) {
    this.logger.error('Error from server transport', {
      error: error.message,
      stack: error.stack
    })
  }
}