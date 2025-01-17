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
  ) { }

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

  // Simpler stream setup with consistent error handling
  private setupStream(stream: NodeJS.ReadWriteStream): void {
    const handleData = (chunk: Buffer) => {
      // Skip non-stdout messages
      if (chunk[0] !== 1) return;

      this.messageBuffer += chunk.slice(8).toString();
      const messages = this.messageBuffer.split('\n');
      this.messageBuffer = messages.pop() || '';

      for (const msg of messages) {
        if (!msg) continue;
        try {
          const parsed = this.validateAndParseMessage(msg);
          this.onmessage?.(parsed);
        } catch (err) {
          this.onerror?.(err as Error);
        }
      }
    };

    stream.on('data', handleData);
    stream.on('end', () => {
      this._closed = true;
      this.onclose?.();
    });
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      this.onerror?.(new McpError(ErrorCode.InternalError, err.message));
    });
  }

  async start(): Promise<void> {
    if (this._closed) {
      throw new McpError(ErrorCode.ConnectionClosed, 'Transport closed');
    }

    try {
      console.log('Creating exec session...');
      const exec = await this.container.exec({
        AttachStderr: true,
        AttachStdout: true,
        AttachStdin: true,
        Tty: false,
        Cmd: this.execCommand,
      });

      console.log('Starting exec session...');
      this.stream = await exec.start({
        hijack: true,
        stdin: true
      });

      console.log('Setting up stream...');
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
    this._closed = true;

    if (this.stream) {
      this.stream.end();
    }

    this.onclose?.();
  }
}