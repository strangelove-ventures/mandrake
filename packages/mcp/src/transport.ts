import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { ServerConfig, TransportType } from './types'
import { createLogger } from '@mandrake/utils'

/**
 * Factory for creating transport instances for MCP connections
 *
 * This factory ensures that critical environment variables (like PATH)
 * are properly passed to child processes, which is especially important
 * for Docker-based tool servers that need access to system binaries.
 */

export class TransportFactory {
  private static logger = createLogger('mcp').child({
    meta: { component: 'transport' }
  })

  /**
   * Gets an enhanced environment object that ensures critical variables are included
   * This is especially important for Docker commands that need PATH and other system variables
   * 
   * Note: This replaces the previous approach of using a global INHERIT_ENV flag by
   * selectively including only the critical environment variables needed for proper operation.
   * This approach is more secure and explicit than inheriting the entire environment.
   */
  private static getEnhancedEnvironment(configEnv?: Record<string, string>): Record<string, string> {
    // Start with the provided config env or an empty object
    const env = configEnv ? { ...configEnv } : {};
    
    // Critical environment variables that should always be included
    const criticalEnvVars = [
      'PATH',              // Required for finding binaries like docker
      'DOCKER_HOST',       // For custom Docker socket
      'DOCKER_CONFIG',     // For Docker config directory
      'DOCKER_CERT_PATH',  // For TLS certificates
      'HOME',              // Often needed by tools
      'USER',              // User identity
      'TERM',              // Terminal type
      'SHELL'              // User's shell
    ];
    
    // Add critical variables from process.env if not already defined
    for (const key of criticalEnvVars) {
      if (!env[key] && process.env[key]) {
        env[key] = process.env[key];
      }
    }
    
    // Log what we're doing
    this.logger.debug('Enhanced environment for transport', { 
      originalKeys: configEnv ? Object.keys(configEnv).length : 0,
      enhancedKeys: Object.keys(env).length
    });
    
    return env;
  }

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
    
    // Use enhanced environment for STDIO transport to ensure critical variables are included
    const enhancedEnv = this.getEnhancedEnvironment(config.env);
    
    return new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: enhancedEnv
    })
  }
}