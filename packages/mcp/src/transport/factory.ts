import { type Logger } from '@mandrake/utils';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import Docker from 'dockerode';
import { StdioMCPTransport } from './stdio';
import { SSEMCPTransport } from './sse';

export type TransportType = 'stdio' | 'sse';

export interface TransportOptions {
  preferredType?: TransportType;
  fallbackToStdio?: boolean;
}

/**
 * Creates appropriate transport based on container capabilities and options.
 * Will attempt SSE if preferred, falling back to stdio if configured.
 */
export async function createTransport(
  container: Docker.Container,
  logger: Logger,
  options: TransportOptions = {}
): Promise<Transport> {
  const { preferredType = 'stdio', fallbackToStdio = true } = options;

  if (preferredType === 'sse') {
    try {
      const transport = new SSEMCPTransport(container, logger);
      await transport.start();
      return transport;
    } catch (err) {
      if (!fallbackToStdio) {
        throw err;
      }
      logger.warn('SSE transport failed, falling back to stdio', { meta: { error: err }});
    }
  }

  // Either stdio was preferred or SSE failed and we're falling back
  const transport = new StdioMCPTransport(container, logger);
  await transport.start();
  return transport;
}