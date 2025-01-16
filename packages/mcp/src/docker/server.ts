import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCPServer, ServerConfig, Tool, ToolResult } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerTransport } from './transport';
import { DockerMCPService } from './service';

export class DockerMCPServer implements MCPServer {
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

  private async waitForReady(maxAttempts = 30, delay = 500): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.client?.ping();
        return;
      } catch (err) {
        if (i === maxAttempts - 1) throw err;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new Error('Server not ready after max attempts');
  }


  async start(): Promise<void> {
    try {
      // Start container if needed
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

      // Connect and wait for ready
      await this.client.connect(this.transport);
      await this.waitForReady();

    } catch (err) {
      console.error('Error during server start:', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    // First try graceful stop with timeout
    try {
      await Promise.race([
        this.container.stop(),
        new Promise(r => setTimeout(r, 3000))
      ]);
    } catch { } // Ignore timeout

    // Force kill if still running
    try {
      const info = await this.container.inspect();
      if (info.State.Running) {
        await this.container.kill();
      }
    } catch (err: any) {
      if (err?.statusCode !== 404) {
        throw err;
      }
    }

    // Finally remove
    try {
      await this.container.remove({ force: true });
    } catch (err: any) {
      if (err?.statusCode !== 404 && err?.statusCode !== 409) {
        throw err;
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
}