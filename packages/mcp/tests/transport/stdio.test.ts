import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { type Logger, DefaultLogger } from '@mandrake/utils';
import { StdioMCPTransport } from '../../src/transport/stdio';
import { DockerContainer } from '../../src/docker/container';
import { McpError, type JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

// Helper for JSONRPC requests
async function sendRequest(transport: StdioMCPTransport, method: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).substring(7);
    
    // Setup handler before sending
    transport.onmessage = (msg: JSONRPCMessage) => {
      if ('error' in msg) {
        reject(new McpError(msg.error.code, msg.error.message));
      } else {
        resolve(msg);
      }
    };
    transport.onerror = (err) => reject(err);

    // Send request
    transport.send({
      jsonrpc: '2.0',
      method,
      params,
      id
    }).catch(reject);
  });
}

describe('StdioMCPTransport with fetch container', () => {
  let dockerContainer: DockerContainer;
  let transport: StdioMCPTransport;
  let logger: Logger;

  beforeAll(async () => {
    logger = new DefaultLogger({ level: 'debug' });
    
    // Setup container
    dockerContainer = new DockerContainer({
      id: 'test-fetch',
      name: 'test-fetch',
      image: 'ghcr.io/strangelove-ventures/mcp/fetch:latest',
      execCommand: ['mcp-server-fetch']
    }, logger);

    // Ensure image is pulled
    await dockerContainer.ensureImage();

    transport = new StdioMCPTransport(dockerContainer, logger);
  });

  afterAll(async () => {
    // Cleanup after each test
    try {
      if (transport?.isConnected()) {
        await transport.close();
      }
      await dockerContainer.cleanup();
    } catch (err) {
      console.error('Test cleanup failed:', err);
    }
  });

  test('should establish connection and list tools', async () => {
    transport = new StdioMCPTransport(dockerContainer, logger);
    
    // Start transport
    await transport.start();
    expect(transport.isConnected()).toBe(true);
    
    // Try listing tools
    const response = await sendRequest(transport, 'listTools');
    expect(response).toBeDefined();
    
    // Basic response structure checks
    expect('result' in response).toBe(true);
    if ('result' in response) {
      expect(Array.isArray(response.result.tools)).toBe(true);
      // Should have at least the fetch tool
      expect(response.result.tools.length).toBeGreaterThan(0);
      expect(response.result.tools.some((t: any) => t.name === 'fetch')).toBe(true);
    }
  }, 10000); // Increase timeout to 10s for first connection
});