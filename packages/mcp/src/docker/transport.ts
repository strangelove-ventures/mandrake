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

  private async createExec() {
    const exec = await this.container.exec({
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      Cmd: this.execCommand
    });

    return await exec.start({
      stdin: true,
      hijack: true
    });
  }

  /**
   * Process a single line from the stream
   */
  private handleMessage(line: string): void {
    if (!line) return; // Skip empty lines
    
    try {
      // First parse as JSON
      const parsed = JSON.parse(line);
      
      // Then validate against MCP schema
      const message = JSONRPCMessageSchema.parse(parsed);
      
      // Verify protocol version
      if ('jsonrpc' in message && message.jsonrpc !== JSONRPC_VERSION) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unsupported JSON-RPC version: ${message.jsonrpc}`
        );
      }

      this.onmessage?.(message);
    } catch (err) {
      // Convert parse errors to McpError
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

  async start(): Promise<void> {
    if (this._closed) {
      throw new McpError(
        ErrorCode.ConnectionClosed,
        'Transport closed'
      );
    }

    try {
      this.stream = await this.createExec();
    } catch (err) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create exec: ${(err as Error).message}`
      );
    }

    this.stream.on('data', (chunk: Buffer) => {
      const streamType = chunk[0];
      const payload = chunk.slice(8);

      // Only process stdout messages
      if (streamType === 1) {
        // Accumulate data in buffer
        this.messageBuffer += payload.toString();
        
        // Process any complete messages
        const lines = this.messageBuffer.split('\n');
        // Keep the last partial line in the buffer
        this.messageBuffer = lines.pop() || '';

        // Process complete lines
        for (const line of lines) {
          this.handleMessage(line);
        }
      }
    });

    this.stream.on('end', () => {
      this._closed = true;
      this.onclose?.();
    });

    this.stream.on('error', (err) => {
      this.onerror?.(new McpError(
        ErrorCode.InternalError,
        `Stream error: ${err.message}`
      ));
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this._closed || !this.stream) {
      throw new McpError(
        ErrorCode.ConnectionClosed,
        'Transport closed'
      );
    }

    try {
      // Validate outgoing message
      JSONRPCMessageSchema.parse(message);
      
      const payload = JSON.stringify(message) + '\n';  // Add newline for stdio protocol

      return new Promise((resolve, reject) => {
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
      (this.stream as any).end?.();
    }
    
    this.onclose?.();
  }
}