import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { ServerConfig, TransportType } from './types'
import { createLogger } from '@mandrake/utils'

/**
 * Factory for creating transport instances for MCP connections
 */
export class TransportFactory {
  private static logger = createLogger('mcp').child({
    meta: { component: 'transport' }
  })

  /**
   * Creates an appropriate transport based on server configuration
   */
  static create(config: ServerConfig): StdioClientTransport | SSEClientTransport {
    this.logger.debug('Creating transport for config', { 
      command: config.command, 
      disabled: config.disabled 
    })

    // Handle disabled configuration
    if (config.disabled) {
      throw new Error('Cannot create transport for disabled server')
    }

    // Check for SSE configuration (command starting with http:// or https://)
    if (config.command.startsWith('http://') || config.command.startsWith('https://')) {
      this.logger.info('Creating SSE transport', { url: config.command })
      
      // Extract headers from environment if present
      const headers: Record<string, string> = {}
      
      if (config.env) {
        // Process auth headers from env (common pattern for auth tokens)
        if (config.env.MCP_AUTH_TOKEN) {
          headers['Authorization'] = `Bearer ${config.env.MCP_AUTH_TOKEN}`
        }
        
        // Process any headers with prefix HEADER_
        Object.entries(config.env).forEach(([key, value]) => {
          if (key.startsWith('HEADER_')) {
            const headerName = key.replace('HEADER_', '')
            headers[headerName] = value
          }
        })
      }
      
      // Create custom headers for SSE connection
      const eventSourceInit: any = { headers };
      
      return new SSEClientTransport(new URL(config.command), { 
        eventSourceInit
      })
    }
    
    // Default to STDIO transport for command-based servers
    this.logger.debug('Creating STDIO transport', { command: config.command })
    return new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: config.env
    })
  }
}