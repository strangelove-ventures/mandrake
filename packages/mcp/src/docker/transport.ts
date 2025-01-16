import Docker from 'dockerode';
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
  private messageBuffer = '';

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private container: Docker.Container,
    private execCommand?: string[]
  ) {}

  async start(): Promise<void> {
    if (this._closed) {
      throw new McpError(
        ErrorCode.ConnectionClosed,
        'Transport closed'
      );
    }

    try {
      const exec = await this.container.exec({
        AttachStderr: true,
        AttachStdout: true,
        AttachStdin: true,
        Tty: false,
        Cmd: this.execCommand,
      });

      this.stream = await exec.start({
        hijack: true,
        stdin: true
      });

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
      throw new McpError(
        ErrorCode.ConnectionClosed,
        'Transport closed'
      );
    }

    try {
      this.validateMessage(message);
      const payload = this.formatMessage(message);

      await new Promise<void>((resolve, reject) => {
        this.stream!.write(Buffer.from(payload), (err) => {
          if (err) {
            reject(new McpError(
              ErrorCode.InternalError,
              `Failed to write to stream: ${err.message}`
            ));
          } else {
            resolve();
          }
        });
      });
    } catch (err) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid message format: ${(err as Error).message}`
      );
    }
  }

  async close(): Promise<void> {
    if (this._closed) return;
    this._closed = true;

    if (this.stream) {
      this.stream.end();  // Force end
      // this.stream.destroy();  // Ensure cleanup
    }

    this.onclose?.();
  }


  private setupStream(stream: NodeJS.ReadWriteStream) {
    stream.on('data', (chunk: Buffer) => {
      const streamType = chunk[0];
      const payload = chunk.slice(8);
      if (streamType === 1) {
        this.messageBuffer += payload.toString();
        const lines = this.messageBuffer.split('\n');
        this.messageBuffer = lines.pop() || '';
        for (const line of lines) {
          this.handleMessage(line);
        }
      }
    });

    stream.on('end', () => {
      this._closed = true;
      this.onclose?.();
    });

    stream.on('error', (err) => {
      this.onerror?.(new McpError(
        ErrorCode.InternalError,
        `Stream error: ${err.message}`
      ));
    });
  }

  private validateMessage(message: JSONRPCMessage): void {
    JSONRPCMessageSchema.parse(message);
    if ('jsonrpc' in message && message.jsonrpc !== JSONRPC_VERSION) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Unsupported JSON-RPC version: ${message.jsonrpc}`
      );
    }
  }

  private formatMessage(message: JSONRPCMessage): string {
    return JSON.stringify(message) + '\n';
  }


  private handleMessage(line: string): void {
    if (!line) return;

    try {
      const parsed = JSON.parse(line);
      const message = JSONRPCMessageSchema.parse(parsed);

      if ('jsonrpc' in message && message.jsonrpc !== JSONRPC_VERSION) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unsupported JSON-RPC version: ${message.jsonrpc}`
        );
      }

      this.onmessage?.(message);
    } catch (err) {
      if (err instanceof SyntaxError) {
        this.onerror?.(new McpError(
          ErrorCode.ParseError,
          'Failed to parse JSON message'
        ));
      } else if (err instanceof McpError) {
        this.onerror?.(err);
      } else {
        this.onerror?.(new McpError(
          ErrorCode.InvalidRequest,
          'Invalid message format'
        ));
      }
    }
  }
}