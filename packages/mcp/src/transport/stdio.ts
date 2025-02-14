import { type Logger } from '@mandrake/utils';
import {
  McpError,
  ErrorCode,
  type JSONRPCMessage,
  JSONRPCMessageSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { DockerContainer } from '../docker/container';

/**
 * Transport implementation that connects to a Docker container using
 * container attach and implements the MCP protocol over 
 * the attached streams.
 */
export class StdioMCPTransport implements Transport {
  private stream?: NodeJS.ReadWriteStream;
  private messageBuffer = '';
  private boundHandleData: (chunk: Buffer) => void;
  private _connected = false;
  private _closing = false;
  private _closed = false;

  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  constructor(
    private container: DockerContainer,
    private logger: Logger,
  ) {
    this.boundHandleData = this.handleData.bind(this);
    this.logger = logger.child({ meta: { service: 'transport' } });
  }

  async start(): Promise<void> {
    this.logger.debug('Starting stdio transport');

    if (this._closed) {
      throw new McpError(ErrorCode.ConnectionClosed, 'Transport closed');
    }

    try {
      // Start container
      await this.container.start();

      // Get Docker container and create exec
      const dockerContainer = this.container.getContainer();
      if (!dockerContainer) {
        throw new Error('Container not available after start');
      }

      // Create exec instance
      const exec = await dockerContainer.exec({
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        Cmd: this.container.config.execCommand
      });

      // Start exec with stream
      this.stream = await exec.start({
        hijack: true,
        stdin: true
      });

      this.setupStream(this.stream);
      this._connected = true;
      this.logger.debug('Stdio transport started successfully');
    } catch (err) {
      this.logger.error('Failed to start stdio transport', { meta: { error: err } });
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to start container with stdio: ${(err as Error).message}`
      );
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const state = {
      isClosed: this._closed,
      isClosing: this._closing,
      hasStream: !!this.stream,
      messageType: 'method' in message ? 'request' : 'response'
    };
    this.logger.debug('Send called', { meta: state });

    if (this._closed || this._closing || !this.stream) {
      this.logger.debug('Send rejected due to state', { meta: state });
      throw new McpError(ErrorCode.ConnectionClosed, 'Transport closed');
    }

    try {
      // Validate against MCP schema
      JSONRPCMessageSchema.parse(message);
      const payload = JSON.stringify(message) + '\n';

      await new Promise<void>((resolve, reject) => {
        this.stream!.write(Buffer.from(payload), (err) => {
          if (err) {
            this.logger.error('Write error', { meta: { error: err }});
            reject(new McpError(ErrorCode.InternalError, err.message));
          } else {
            this.logger.debug('Write successful');
            resolve();
          }
        });
      });
    } catch (err) {
      this.logger.error('Send error', { meta: { error: err }});
      if (err instanceof McpError) throw err;
      throw new McpError(ErrorCode.InvalidRequest, 'Invalid message format');
    }
  }

  async close(): Promise<void> {
    if (this._closed || this._closing) {
      this.logger.debug('Transport already closed or closing');
      return;
    }

    this._closing = true;
    this.logger.debug('Closing transport');

    try {
      if (this.stream) {
        this.logger.debug('Cleaning up stream');
        
        // Remove data handler
        this.stream.removeListener('data', this.boundHandleData);

        // Remove any other listeners
        this.stream.removeAllListeners('end');
        this.stream.removeAllListeners('error');

        // End the stream
        await new Promise<void>((resolve) => {
          const cleanup = () => {
            this.logger.debug('Stream ended/errored during close');
            this.stream?.removeAllListeners();
            resolve();
          };

          this.stream?.once('end', cleanup);
          this.stream?.once('error', cleanup);

          this.logger.debug('Ending stream');
          this.stream?.end();
        });

        this.stream = undefined;
        this.messageBuffer = '';
      }

      // Let container manager handle container cleanup
      await this.container.cleanup();

      this._closed = true;
      this._connected = false;
      this.logger.debug('Transport closed successfully');
    } catch (err) {
      this.logger.error('Error during close', { meta: { error: err }});
      throw err;
    } finally {
      this._closing = false;
    }
  }

  async reconnect(): Promise<void> {
    this.logger.debug('Attempting transport reconnection');
    
    if (!this._closed) {
      await this.close();
    }

    this._closed = false;
    this._closing = false;
    
    await this.start();
  }

  isConnected(): boolean {
    return this._connected && !this._closing && !this._closed;
  }

  private setupStream(stream: NodeJS.ReadWriteStream): void {
    this.logger.debug('Setting up stream handlers');
    
    stream.on('data', this.boundHandleData);

    stream.on('end', () => {
      this.logger.debug('Stream end event received');
      if (!this._closed && !this._closing) {
        this._closed = true;
        this._connected = false;
        if (this.onclose) {
          this.logger.debug('Calling onclose callback');
          this.onclose();
        }
      }
    });

    stream.on('error', (err) => {
      this.logger.debug('Stream error event', { meta: { error: err }});
      if (!this._closed && !this._closing) {
        this.logger.error('Stream error while active', { meta: { error: err }});
        if (this.onerror) {
          this.onerror(new McpError(ErrorCode.InternalError, err.message));
        }
      }
    });
  }

  private handleData(chunk: Buffer): void {
    const state = {
      chunkSize: chunk.length,
      firstByte: chunk[0],
      isClosed: this._closed,
      isClosing: this._closing,
      hasOnMessage: !!this.onmessage,
      hasStream: !!this.stream,
      messageBufferSize: this.messageBuffer.length
    };

    this.logger.debug('Handle data entry', { meta: state });

    if (this._closed || this._closing) {
      this.logger.debug('HandleData called while closed/closing', { meta: state });
      return;
    }

    // Docker multiplexes streams with an 8-byte header
    // First byte indicates stream (1 = stdout)
    if (chunk[0] !== 1) {
      this.logger.debug('Skipping non-stdout message', { meta: state });
      return;
    }

    // Extract message content (skip 8-byte Docker header)
    const messageContent = chunk.slice(8).toString();
    this.messageBuffer += messageContent;

    // Split on newlines and process each complete message
    const messages = this.messageBuffer.split('\n');
    // Keep last partial message in buffer
    this.messageBuffer = messages.pop() || '';

    for (const msg of messages) {
      if (!msg) continue;

      const msgState = {
        ...state,
        messageLength: msg.length,
        messageStart: msg.slice(0, 50)
      };
      this.logger.debug('Processing message', { meta: msgState });

      try {
        if (this._closed || this._closing) {
          this.logger.debug('State changed during message processing', { meta: msgState });
          return;
        }

        // Parse and validate against MCP schema
        const parsed = JSONRPCMessageSchema.parse(JSON.parse(msg));
        
        if (this.onmessage && !this._closed && !this._closing) {
          this.onmessage(parsed);
          this.logger.debug('Message processed successfully');
        }
      } catch (err) {
        this.logger.error('Message processing error', { 
          meta: { 
            error: err,
            messageContent: msg
          }
        });

        if (this.onerror && !this._closed && !this._closing) {
          this.onerror(err instanceof McpError ? err : new McpError(ErrorCode.ParseError, 'Failed to parse JSON message'));
        }
      }
    }
  }
}