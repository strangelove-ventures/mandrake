import Docker from 'dockerode';
import { Logger } from '@mandrake/types';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { 
  McpError,
  ErrorCode,
  JSONRPCMessage,
  JSONRPCMessageSchema,
  JSONRPC_VERSION,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Transport implementation that connects to a Docker container using
 * container.attach and implements the MCP protocol over the attached
 * stream.
 */
export class DockerTransport implements Transport {
  private stream?: NodeJS.ReadWriteStream;
  private _closed = false;
  private _closing = false;
  private messageBuffer = '';
  private transportLogger: Logger;
  private boundHandleData: (chunk: Buffer) => void;


  onclose?: () => void | undefined;
  onerror?: (error: Error) => void | undefined;
  onmessage?: (message: JSONRPCMessage) => void | undefined;

  constructor(
    private container: Docker.Container,
    serverLogger: Logger,
    private execCommand?: string[]
  ) {
    this.transportLogger = serverLogger.child({ service: 'transport' });
    // Bind handleData once in constructor
    this.boundHandleData = this.handleData.bind(this);
  }

  private handleData(chunk: Buffer) {
    // Don't process any data if we're closing/closed
    if (chunk[0] !== 1 || this._closed || this._closing) return;

    this.messageBuffer += chunk.slice(8).toString();
    const messages = this.messageBuffer.split('\n');
    this.messageBuffer = messages.pop() || '';

    // Only process messages if we're still active
    if (!this._closed && !this._closing) {
      for (const msg of messages) {
        if (!msg) continue;
        try {
          const parsed = this.validateAndParseMessage(msg);
          if (this.onmessage && !this._closed && !this._closing) {
            this.onmessage(parsed);
          }
        } catch (err) {
          if (this.onerror && !this._closed && !this._closing) {
            this.onerror(err as Error);
          }
        }
      }
    }
  }

  // Single message validation method used for both send/receive
  private validateAndParseMessage(data: string): JSONRPCMessage {
    try {
      const parsed = JSON.parse(data);
      const message = JSONRPCMessageSchema.parse(parsed);

      // Version check in one place
      if ('jsonrpc' in message && message.jsonrpc !== JSONRPC_VERSION) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unsupported JSON-RPC version: ${message.jsonrpc}`
        );
      }

      return message;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new McpError(ErrorCode.ParseError, 'Failed to parse JSON message');
      }
      if (err instanceof McpError) {
        throw err;
      }
      throw new McpError(ErrorCode.InvalidRequest, 'Invalid message format');
    }
  }

  private setupStream(stream: NodeJS.ReadWriteStream): void {
    this.stream = stream;
    stream.on('data', this.boundHandleData);
    stream.on('end', () => {
      if (!this._closed && !this._closing) {
        this._closed = true;
        this.onclose?.();
      }
    });
    stream.on('error', (err) => {
      if (!this._closed && !this._closing) {
        this.transportLogger.error('Stream error', { error: err });
        this.onerror?.(new McpError(ErrorCode.InternalError, err.message));
      }
    });
  }

  async detachHandlers(): Promise<void> {
    this._closing = true;

    if (this.stream) {
      this.stream.removeListener('data', this.boundHandleData);
      this.stream.removeAllListeners('end');
      this.stream.removeAllListeners('error');
    }

    // Clear callbacks after removing listeners
    this.onmessage = undefined;
    this.onerror = undefined;
    this.onclose = undefined;
  }



  async start(): Promise<void> {
    if (this._closed) {
      throw new McpError(ErrorCode.ConnectionClosed, 'Transport closed');
    }

    try {
      this.transportLogger.debug('Creating exec session');
      const exec = await this.container.exec({
        AttachStderr: true,
        AttachStdout: true,
        AttachStdin: true,
        Tty: false,
        Cmd: this.execCommand,
      });

      this.transportLogger.debug('Starting exec session');
      this.stream = await exec.start({
        hijack: true,
        stdin: true
      });

      this.transportLogger.debug('Setting up stream');
      this.setupStream(this.stream);
    } catch (err) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create exec: ${(err as Error).message}`
      );
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this._closed || !this.stream) {
      throw new McpError(ErrorCode.ConnectionClosed, 'Transport closed');
    }

    try {
      // Use same validation as receive path
      this.validateAndParseMessage(JSON.stringify(message));
      const payload = JSON.stringify(message) + '\n';

      await new Promise<void>((resolve, reject) => {
        this.stream!.write(Buffer.from(payload), (err) => {
          if (err) {
            reject(new McpError(ErrorCode.InternalError, err.message));
          } else {
            resolve();
          }
        });
      });
    } catch (err) {
      if (err instanceof McpError) throw err;
      throw new McpError(ErrorCode.InvalidRequest, 'Invalid message format');
    }
  }


  async close(): Promise<void> {
    if (this._closed) return;

    // Only end stream if we haven't started closing yet
    if (!this._closing) {
      this._closing = true;

      if (this.stream) {
        // First end the stream
        await new Promise<void>((resolve) => {
          const cleanup = () => {
            this.stream?.removeAllListeners();
            resolve();
          };

          this.stream?.once('end', cleanup);
          this.stream?.once('error', cleanup);
          this.stream?.end();
        });
      }
    }

    this._closed = true;
  }
}