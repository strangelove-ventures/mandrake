import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCPServer, ServerConfig, Tool, ToolResult } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerTransport } from './transport';

export class DockerMCPServer implements MCPServer {
  private client?: Client;
  private transport?: DockerTransport;

  constructor(
    private config: ServerConfig,
    private container: Docker.Container,
  ) {}

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  async start(): Promise<void> {
    // Start container if not running
    const info = await this.container.inspect();
    if (!info.State.Running) {
      await this.container.start();
    }

    // Initialize transport and client
    this.transport = new DockerTransport(this.container, this.config.execCommand);
    this.client = new Client(
      {
        name: 'mandrake',
        version: '1.0.0',
      }, 
      { 
        capabilities: {
          tools: {},
        }
      }
    );

    // Connect client
    await this.client.connect(this.transport);
  }

  async stop(): Promise<void> {
    try {
      // First close MCP client/transport
      await this.client?.close();
      this.client = undefined;
      this.transport = undefined;

      try {
        // Check if container exists first
        await this.container.inspect();
        // Only try to stop and remove if it exists
        await this.container.stop();
        await this.container.remove({ force: true });
      } catch (err: any) {
        // Ignore 404s - container already gone is fine
        if (err?.statusCode !== 404 && err?.statusCode !== 409) {
          throw err;
        }
      }
    } catch (err) {
      console.error('Error during server stop:', err);
      throw err;
    }

  }



  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async listTools(): Promise<Tool[]> {
    if (!this.client) {
      throw new Error('Server not started');
    }
    const result = await this.client.listTools();
    return result.tools;
  }

  async invokeTool(name: string, params: any): Promise<ToolResult> {
    if (!this.client) {
      throw new Error('Server not started');
    }
    const result = await this.client.callTool({ name, arguments: params });
    return { ...result, content: result.content || '' } as ToolResult;
  }

  async getInfo(): Promise<Docker.ContainerInspectInfo> {
    return this.container.inspect();
  }
}

function isContainerNotFoundError(err: any): boolean {
  return err?.statusCode === 404 ||
    err?.reason === 'no such container' ||
    err?.message?.includes('no such container');
}