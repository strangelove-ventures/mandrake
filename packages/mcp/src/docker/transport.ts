import Docker from 'dockerode';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

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

  async start(): Promise<void> {
    if (this._closed) {
      throw new Error('Transport closed');
    }

    // Use exec instead of attach
    this.stream = await this.createExec();

    this.stream.on('data', (chunk: Buffer) => {
      const streamType = chunk[0];
      const payload = chunk.slice(8);

      if (streamType === 1) { // stdout
        // Accumulate data in buffer
        this.messageBuffer += payload.toString();
        
        // Process any complete messages
        const lines = this.messageBuffer.split('\n');
        // Keep the last partial line in the buffer
        this.messageBuffer = lines.pop() || '';

        // Process complete lines
        for (const line of lines) {
          if (!line) continue; // Skip empty lines
          try {
            const message = JSON.parse(line);
            this.onmessage?.(message);
          } catch (err) {
            console.error('Failed to parse message:', {
              error: err,
              message: line
            });
          }
        }
      }
    });

    this.stream.on('end', () => {
      this._closed = true;
      this.onclose?.();
    });

    this.stream.on('error', (err) => {
      this.onerror?.(err);
    });
  }

  async send(data: JSONRPCMessage): Promise<void> {
    if (this._closed || !this.stream) {
      throw new Error('Transport closed');
    }

    const payload = JSON.stringify(data) + '\n';  // Add newline for stdio protocol

    return new Promise((resolve, reject) => {
      this.stream!.write(Buffer.from(payload), (err) => {
        if (err) {
          console.error('Send error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
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