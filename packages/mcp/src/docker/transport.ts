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
  public stream?: NodeJS.ReadWriteStream;
  private _closed = false;
  private _closing = false;
  private messageBuffer = '';
  private transportLogger: Logger;
  public boundHandleData: (chunk: Buffer) => void;
  private messageHandlers: Set<(chunk: Buffer) => void> = new Set();

  onclose?: () => void | undefined;
  onerror?: (error: Error) => void | undefined;
  onmessage?: (message: JSONRPCMessage) => void | undefined;

  constructor(
    private container: Docker.Container,
    serverLogger: Logger,
    private execCommand?: string[]
  ) {
    this.transportLogger = serverLogger.child({ service: 'transport' });
    this.boundHandleData = this.handleData.bind(this);
    this.messageHandlers.add(this.boundHandleData);
  }

  private handleData(chunk: Buffer) {
    const state = {
      chunkSize: chunk.length,
      firstByte: chunk[0],
      isClosed: this._closed,
      isClosing: this._closing,
      hasOnMessage: !!this.onmessage,
      hasStream: !!this.stream,
      handlersCount: this.messageHandlers.size,
      messageBufferSize: this.messageBuffer.length
    };

    this.transportLogger.debug('Handle data entry', state);

    // Immediately check state
    if (this._closed || this._closing) {
      this.transportLogger.debug('HandleData called while closed/closing', state);
      return;
    }

    // Skip non-stdout messages
    if (chunk[0] !== 1) {
      this.transportLogger.debug('Skipping non-stdout message', state);
      return;
    }

    // Extract message content
    const messageContent = chunk.slice(8).toString();
    this.messageBuffer += messageContent;

    const messages = this.messageBuffer.split('\n');
    this.messageBuffer = messages.pop() || '';

    for (const msg of messages) {
      if (!msg) {
        this.transportLogger.debug('Skipping empty message');
        continue;
      }

      const msgState = {
        ...state,
        messageLength: msg.length,
        messageStart: msg.slice(0, 50)
      };
      this.transportLogger.debug('Processing message', msgState);

      try {
        // Triple-check state before parsing
        if (this._closed || this._closing) {
          this.transportLogger.debug('State changed during message processing', msgState);
          return;
        }

        const parsed = this.validateAndParseMessage(msg);

        // Log parsed message details
        this.transportLogger.debug('Message parsed', {
          ...msgState,
          messageType: 'method' in parsed ? 'request' : 'response',
          hasId: 'id' in parsed
        });

        // Final state check before callback
        if (this.onmessage && !this._closed && !this._closing) {
          const finalState = {
            ...msgState,
            stillHasOnMessage: !!this.onmessage,
            stillNotClosed: !this._closed,
            stillNotClosing: !this._closing
          };
          this.transportLogger.debug('Pre-callback state check', finalState);

          this.onmessage(parsed);

          this.transportLogger.debug('Message callback completed successfully');
        } else {
          this.transportLogger.debug('Skipping callback due to state', {
            hasCallback: !!this.onmessage,
            isClosed: this._closed,
            isClosing: this._closing
          });
        }
      } catch (err) {
        this.transportLogger.error('Message processing error', {
          error: err,
          messageContent: msg,
          state: msgState
        });

        if (this.onerror && !this._closed && !this._closing) {
          this.onerror(err as Error);
        }
      }
    }
  }

  private validateAndParseMessage(data: string): JSONRPCMessage {
    try {
      const parsed = JSON.parse(data);
      const message = JSONRPCMessageSchema.parse(parsed);

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
    this.transportLogger.debug('Setting up stream handlers');
    this.stream = stream;

    stream.on('data', this.boundHandleData);

    stream.on('end', () => {
      this.transportLogger.debug('Stream end event received');
      if (!this._closed && !this._closing) {
        this._closed = true;
        if (this.onclose) {
          this.transportLogger.debug('Calling onclose callback');
          this.onclose();
        }
      } else {
        this.transportLogger.debug('Stream end ignored due to state', {
          isClosed: this._closed,
          isClosing: this._closing
        });
      }
    });

    stream.on('error', (err) => {
      this.transportLogger.debug('Stream error event', { error: err });
      if (!this._closed && !this._closing) {
        this.transportLogger.error('Stream error while active', { error: err });
        if (this.onerror) {
          this.onerror(new McpError(ErrorCode.InternalError, err.message));
        }
      } else {
        this.transportLogger.debug('Stream error ignored due to state', {
          isClosed: this._closed,
          isClosing: this._closing,
          error: err
        });
      }
    });

    this.transportLogger.debug('Stream setup complete', {
      hasDataHandlers: stream.listenerCount('data'),
      hasEndHandlers: stream.listenerCount('end'),
      hasErrorHandlers: stream.listenerCount('error')
    });
  }

  async start(): Promise<void> {
    this.transportLogger.debug('Starting transport');
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
      this.transportLogger.debug('Transport start complete');
    } catch (err) {
      this.transportLogger.error('Transport start failed', { error: err });
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create exec: ${(err as Error).message}`
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
    this.transportLogger.debug('Send called', state);

    if (this._closed || this._closing || !this.stream) {
      this.transportLogger.debug('Send rejected due to state', state);
      throw new McpError(ErrorCode.ConnectionClosed, 'Transport closed');
    }

    try {
      this.validateAndParseMessage(JSON.stringify(message));
      const payload = JSON.stringify(message) + '\n';

      await new Promise<void>((resolve, reject) => {
        this.stream!.write(Buffer.from(payload), (err) => {
          if (err) {
            this.transportLogger.error('Write error', { error: err });
            reject(new McpError(ErrorCode.InternalError, err.message));
          } else {
            this.transportLogger.debug('Write successful');
            resolve();
          }
        });
      });
    } catch (err) {
      this.transportLogger.error('Send error', { error: err });
      if (err instanceof McpError) throw err;
      throw new McpError(ErrorCode.InvalidRequest, 'Invalid message format');
    }
  }

  async close(): Promise<void> {
    const state = {
      isClosed: this._closed,
      isClosing: this._closing,
      hasStream: !!this.stream,
      handlersCount: this.messageHandlers.size
    };
    this.transportLogger.debug('Close called', state);

    if (this._closed || this._closing) {
      this.transportLogger.debug('Already closed or closing', state);
      return;
    }

    this._closing = true;
    this.transportLogger.debug('Set closing state');

    try {
      if (this.stream) {
        // Clear all handlers first
        this.transportLogger.debug('Removing stream handlers', {
          beforeDataHandlers: this.stream.listenerCount('data'),
          beforeEndHandlers: this.stream.listenerCount('end'),
          beforeErrorHandlers: this.stream.listenerCount('error')
        });

        // Remove our tracked handlers
        this.messageHandlers.forEach(handler => {
          this.stream?.removeListener('data', handler);
        });
        this.messageHandlers.clear();

        // Remove any other listeners
        this.stream.removeAllListeners('end');
        this.stream.removeAllListeners('error');

        // Clear callbacks before ending stream
        this.onmessage = undefined;
        this.onerror = undefined;
        this.onclose = undefined;

        // End the stream
        await new Promise<void>((resolve) => {
          const cleanup = () => {
            this.transportLogger.debug('Stream end/error during close');
            this.stream?.removeAllListeners();
            resolve();
          };

          this.stream?.once('end', cleanup);
          this.stream?.once('error', cleanup);

          this.transportLogger.debug('Ending stream');
          this.stream?.end();
        });

        this.transportLogger.debug('Stream cleanup complete');
      }

      this._closed = true;
      this.transportLogger.debug('Close complete', {
        finalState: {
          isClosed: this._closed,
          isClosing: this._closing,
          hasStream: !!this.stream,
          handlersCount: this.messageHandlers.size
        }
      });
    } catch (err) {
      this.transportLogger.error('Error during close', { error: err });
      throw err;
    }
  }
}