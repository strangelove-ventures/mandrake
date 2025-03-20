import { createLogger } from '@mandrake/utils'
import { MCPProxy } from '../proxy'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

/**
 * Manages proxy operations between client and server transports
 * 
 * This class is responsible for:
 * - Setting up bidirectional proxies
 * - Closing proxy connections
 */
export class ProxyManager {
  private proxy?: MCPProxy
  private logger = createLogger('mcp').child({ 
    meta: { component: 'proxy-manager', id: this.id }
  })
  
  constructor(
    private id: string
  ) {}

  /**
   * Create a proxy between two transports
   */
  createProxy(
    clientTransport: Transport, 
    serverTransport: Transport
  ): MCPProxy {
    this.proxy = new MCPProxy(clientTransport, serverTransport)
    return this.proxy
  }

  /**
   * Close the proxy connection
   */
  async closeProxy(): Promise<void> {
    if (this.proxy) {
      await this.proxy.close()
      this.proxy = undefined
    }
  }

  /**
   * Get the current proxy
   */
  getProxy(): MCPProxy | undefined {
    return this.proxy
  }
}