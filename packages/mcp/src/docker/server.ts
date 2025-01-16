import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCPServer, ServerConfig, Tool, ToolResult } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerTransport } from './transport';
import { DockerMCPService } from './service';


export class DockerMCPServer implements MCPServer {
  private static readonly MAX_READY_ATTEMPTS = 20;
  private static readonly READY_CHECK_DELAY = 250;
  private static readonly STOP_RETRY_ATTEMPTS = 3;
  private static readonly STOP_RETRY_DELAY = 500;
  private client?: Client;
  private transport?: DockerTransport;

  constructor(
    private config: ServerConfig,
    private container: Docker.Container,
    private service: DockerMCPService
  ) {}

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  async start(): Promise<void> {
    try {
      await this.ensureContainer();
      this.initializeClient();
      await this.client!.connect(this.transport!);
      await this.client!.ping();  // One attempt to verify connection
    } catch (err) {
      console.error('Error during server start:', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    // Clean up client/transport
    if (this.client) {
      await this.client.close().catch(() => { });  // Best effort
      this.client = undefined;
      this.transport = undefined;
    }

    // Just force remove container
    try {
      await this.container.remove({ force: true });
    } catch (err: any) {
      if (err?.statusCode !== 404 && err?.statusCode !== 409) {
        throw err;  // Only throw on unexpected errors
      }
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
    try {
      return await this.container.inspect();
    } catch (err: any) {
      // Return a default state for removed containers
      if (err?.statusCode === 404) {
        return { State: { Running: false } } as Docker.ContainerInspectInfo;
      }
      throw err;
    }
  }

  private initializeClient(): void {
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
  }

  private async ensureContainer(): Promise<void> {
    try {
      const info = await this.container.inspect();
      if (!info.State.Running) {
        await this.container.start();
      }
    } catch (err: any) {
      if (err?.statusCode === 404) {
        this.container = await this.service.createContainer(this.config);
        await this.container.start();
      } else {
        throw err;
      }
    }
  }
}