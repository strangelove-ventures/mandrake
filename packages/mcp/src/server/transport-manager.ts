import { createLogger } from '@mandrake/utils'
import { TransportFactory } from '../transport'
import type { ServerConfig } from '../types'
import type { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Stream } from 'node:stream'
import { TransportError, MCPErrorCode } from '../errors'

/**
 * Manages transport creation and lifecycle
 * 
 * This class is responsible for:
 * - Creating the appropriate transport based on config
 * - Setting up stderr handling for stdio transports
 * - Closing transports cleanly
 */
export class TransportManager {
  private transport?: ReturnType<typeof TransportFactory.create>
  private logger = createLogger('mcp').child({ 
    meta: { component: 'transport-manager', id: this.id }
  })
  
  constructor(
    private id: string,
    private onStderrOutput: (output: string, level?: 'debug' | 'info' | 'warning' | 'error', metadata?: Record<string, any>) => void
  ) {}

  /**
   * Create a transport based on server configuration
   */
  createTransport(config: ServerConfig): StdioClientTransport | SSEClientTransport {
    try {
      this.transport = TransportFactory.create(config)
      
      // Setup stderr logging if stdio transport
      if (this.isStdioTransport(this.transport) && this.transport.stderr) {
        this.handleStderr(this.transport.stderr)
      }
      
      return this.transport
    } catch (error) {
      throw new TransportError(
        this.id, 
        MCPErrorCode.TRANSPORT_CREATION_FAILED,
        error instanceof Error ? error : undefined,
        { config }
      )
    }
  }

  /**
   * Check if transport is a stdio transport
   */
  private isStdioTransport(transport: any): transport is StdioClientTransport {
    return transport && 'stderr' in transport
  }

  /**
   * Close the transport
   */
  async closeTransport(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close()
        this.transport = undefined
      } catch (error) {
        throw new TransportError(
          this.id,
          MCPErrorCode.TRANSPORT_CLOSED,
          error instanceof Error ? error : undefined
        )
      }
    }
  }

  /**
   * Get the current transport
   */
  getTransport(): StdioClientTransport | SSEClientTransport | undefined {
    return this.transport
  }

  /**
   * Handle stderr output from stdio transports
   */
  private handleStderr(stream: Stream | null) {
    if (!stream) return

    stream.on('data', (data: Buffer) => {
      const output = data.toString()
      
      // Determine log level based on content
      const hasError = output.toLowerCase().includes('error');
      const hasWarning = output.toLowerCase().includes('warn');
      
      const metadata = { 
        id: this.id,
        source: 'stderr',
        content: output
      };
      
      // Log to the buffer with appropriate level
      if (hasError) {
        this.onStderrOutput(output, 'error', metadata);
        this.logger.error('Error from server stderr', { 
          id: this.id, 
          error: output 
        });
      } else if (hasWarning) {
        this.onStderrOutput(output, 'warning', metadata);
        this.logger.warn('Warning from server stderr', { 
          id: this.id, 
          warning: output 
        });
      } else {
        this.onStderrOutput(output, 'info', metadata);
      }
    })
  }
}