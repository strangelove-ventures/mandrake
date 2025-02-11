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

export class DockerTransport implements Transport {
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private nodeStream?: NodeJS.ReadWriteStream;
  private messageBuffer = '';
  private transportLogger: Logger;
  private _closed = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private container: Docker.Container,
    serverLogger: Logger,
    private execCommand?: string[]
  ) {
    this.transportLogger = serverLogger.child({ service: 'transport' });
  }

  async start(): Promise<void> {
    this.transportLogger.info('DockerTransport.start() called');

    try {
      // Create exec instance
      this.transportLogger.info('Creating exec instance', { cmd: this.execCommand });
      const exec = await this.container.exec({
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        Cmd: this.execCommand
      });
      this.transportLogger.info('Exec instance created', { execId: exec.id });

      const opts = {
        Detach: false,
        Tty: false,
        stdin: true,
        hijack: true,
        stdout: true,
        stderr: true
      } as Docker.ExecStartOptions;

      this.transportLogger.info('Starting exec session');

      this.nodeStream = await Promise.race([
        exec.start(opts),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Exec start timeout after 5s')), 5000);
        })
      ]);

      this.transportLogger.info('Exec session started successfully');

      // Set up data handling
      this.nodeStream.on('data', (chunk: Buffer) => {
        this.transportLogger.debug('Stream data received', {
          chunkLength: chunk.length,
          firstByte: chunk[0],
          preview: chunk.toString('hex').slice(0, 32)
        });
        this.handleData(chunk);
      });

      this.nodeStream.on('end', () => {
        this.transportLogger.info('Stream end event received');
        this.cleanup('Stream ended');
      });

      this.nodeStream.on('error', (err) => {
        this.transportLogger.error('Stream error event', { error: err });
        this.cleanup(err.message);
      });

      this.nodeStream.on('close', () => {
        this.transportLogger.info('Stream close event received');
      });

      // Verify stream is readable/writable
      this.transportLogger.info('Stream setup complete', {
        readable: this.nodeStream.readable,
        writable: this.nodeStream.writable,
        dataListeners: this.nodeStream.listenerCount('data'),
        errorListeners: this.nodeStream.listenerCount('error')
      });

    } catch (err) {
      this.transportLogger.error('Transport start failed', {
        error: err,
        stack: (err as Error).stack
      });
      throw err;
    }
  }

  private handleData(chunk: Buffer): void {
    try {
      // Skip non-stdout frames
      if (chunk[0] !== 1) {
        this.transportLogger.debug('Skipping non-stdout frame', {
          frameType: chunk[0]
        });
        return;
      }

      // Process docker stream frame (skip 8-byte header)
      const content = this.decoder.decode(chunk.slice(8));
      this.messageBuffer += content;

      const messages = this.messageBuffer.split('\n');
      this.messageBuffer = messages.pop() || '';

      for (const msg of messages) {
        if (!msg.trim()) continue;

        try {
          this.transportLogger.debug('Processing message', {
            messageLength: msg.length,
            messagePreview: msg.slice(0, 100)
          });

          const parsed = JSONRPCMessageSchema.parse(JSON.parse(msg));

          if ('jsonrpc' in parsed && parsed.jsonrpc !== JSONRPC_VERSION) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Invalid JSON-RPC version: ${parsed.jsonrpc}`
            );
          }

          if (this.onmessage && !this._closed) {
            this.transportLogger.debug('Dispatching message to handler');
            this.onmessage(parsed);
          }
        } catch (err) {
          this.transportLogger.error('Message processing failed', {
            error: err,
            message: msg
          });
          if (this.onerror && !this._closed) {
            this.onerror(err as Error);
          }
        }
      }
    } catch (err) {
      this.transportLogger.error('Data handling failed', {
        error: err,
        chunk: chunk.toString('hex')
      });
      if (this.onerror && !this._closed) {
        this.onerror(err as Error);
      }
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this._closed || !this.nodeStream) {
      throw new McpError(ErrorCode.ConnectionClosed, 'Transport closed');
    }

    try {
      const payload = this.encoder.encode(JSON.stringify(message) + '\n');

      this.transportLogger.debug('Sending message', {
        payloadLength: payload.length,
        messageType: 'method' in message ? 'request' : 'response'
      });

      await new Promise<void>((resolve, reject) => {
        this.nodeStream!.write(payload, (err) => {
          if (err) {
            this.transportLogger.error('Write failed', { error: err });
            reject(err);
          } else {
            this.transportLogger.debug('Write successful');
            resolve();
          }
        });
      });
    } catch (err) {
      this.transportLogger.error('Send failed', { error: err });
      throw new McpError(
        ErrorCode.InternalError,
        `Send failed: ${(err as Error).message}`
      );
    }
  }

  private cleanup(reason: string): void {
    if (this._closed) return;

    this.transportLogger.info('Starting cleanup', { reason });
    this._closed = true;

    if (this.nodeStream) {
      this.transportLogger.debug('Cleaning up stream');
      this.nodeStream.removeAllListeners();
      this.nodeStream.end();
      this.nodeStream = undefined;
    }

    if (this.onclose) {
      this.transportLogger.debug('Calling onclose handler');
      this.onclose();
    }

    this.onmessage = undefined;
    this.onerror = undefined;
    this.onclose = undefined;
    this.transportLogger.info('Cleanup complete');
  }

  async close(): Promise<void> {
    this.transportLogger.info('Close called');
    this.cleanup('Explicit close called');
  }
}