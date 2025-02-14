import { type Logger } from '@mandrake/utils';
import {
  McpError,
  ErrorCode,
  type JSONRPCMessage,
  JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import Docker from 'dockerode';

/**
 * Transport implementation that connects to a Docker container using
 * HTTP with Server-Sent Events for server-to-client messages and
 * HTTP POST for client-to-server messages.
 * 
 * NOTE: This is a stub implementation for future development.
 */
export class SSEMCPTransport implements Transport {
  private _connected = false;
  private _closing = false;
  private _closed = false;
  private eventSource?: EventSource;

  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  constructor(
    private container: Docker.Container,
    private logger: Logger,
  ) {
    this.logger = logger.child({ meta: { service: 'transport-sse' } });
  }

  async start(): Promise<void> {
    throw new McpError(ErrorCode.InternalError, 'SSE Transport not yet implemented');
  }

  async send(message: JSONRPCMessage): Promise<void> {
    throw new McpError(ErrorCode.InternalError, 'SSE Transport not yet implemented');
  }

  async close(): Promise<void> {
    throw new McpError(ErrorCode.InternalError, 'SSE Transport not yet implemented');
  }

  async reconnect(): Promise<void> {
    throw new McpError(ErrorCode.InternalError, 'SSE Transport not yet implemented');
  }

  isConnected(): boolean {
    return this._connected && !this._closing && !this._closed;
  }
}