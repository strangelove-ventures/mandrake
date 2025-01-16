import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCPServer, ServerConfig, Tool, ToolResult } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerTransport } from './transport';
import { DockerMCPService } from './service';

// These would move to a shared config file
import { SERVER_CONFIG } from './config';

export class DockerMCPServer implements MCPServer {
  private client?: Client;
  private transport?: DockerTransport;

  constructor(
    private config: ServerConfig,
    private container: Docker.Container,
    private service: DockerMCPService
  ) { }

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  async start(): Promise<void> {
    try {
      await this.ensureContainer();
      await this.ensureClient();
      await this.client!.ping();  // Connection check
    } catch (err) {
      await this.cleanup();  // Ensure cleanup on any error
      throw err;
    }
  }

  async stop(): Promise<void> {
    await this.cleanup();
  }

  // Removing restart since it's just a composition that could live at service level

  async listTools(): Promise<Tool[]> {
    if (!this.isReady()) {
      throw new Error('Server not ready');
    }
    const result = await this.client!.listTools();
    return result.tools;
  }

  async invokeTool(name: string, params: any): Promise<ToolResult> {
    if (!this.isReady()) {
      throw new Error('Server not ready');
    }
    const result = await this.client!.callTool({ name, arguments: params });
    return { ...result, content: result.content || '' } as ToolResult;
  }

  async getInfo(): Promise<Docker.ContainerInspectInfo> {
    try {
      return await this.container.inspect();
    } catch (err: any) {
      if (err?.statusCode === 404) {
        return { State: { Running: false } } as Docker.ContainerInspectInfo;
      }
      throw err;
    }
  }

  private isReady(): boolean {
    return !!(this.client && this.transport);
  }

  private async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.close().catch(() => { });
      this.client = undefined;
      this.transport = undefined;
    }

    try {
      await this.container.remove({ force: true });
    } catch (err: any) {
      if (err?.statusCode !== 404 && err?.statusCode !== 409) {
        throw err;
      }
    }
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

  private async ensureClient(): Promise<void> {
    this.transport = new DockerTransport(this.container, this.config.execCommand);
    this.client = new Client(
      SERVER_CONFIG.client.info,
      SERVER_CONFIG.client.options
    );
    await this.client.connect(this.transport);
  }
}