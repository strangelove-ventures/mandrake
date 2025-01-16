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
    try {
      const info = await this.container.inspect();
      console.log('Container inspection:', {
        id: info.Id,
        running: info.State.Running
      });
      if (!info.State.Running) {
        console.log('Starting container');
        await this.container.start();
      }

      // Initialize transport and client
      console.log('Initializing transport and client');
      this.transport = new DockerTransport(this.container, this.config.execCommand);
      this.client = new Client({
        name: 'mandrake',
        version: '1.0.0',
      },
        {
          capabilities: {
            tools: {},
          }
        });

      console.log('Connecting client');
      await this.client.connect(this.transport);
      console.log('Server started successfully');
    } catch (err) {
      console.error('Error during server start:', err);
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      // First close MCP client/transport
      await this.client?.close();
      this.client = undefined;
      this.transport = undefined;

      try {
        console.log('Inspecting container before stop');
        await this.container.inspect();
        console.log('Container exists, stopping and removing');
        await this.container.stop();
        await this.container.remove({ force: true });
        console.log('Container stopped and removed successfully');
      } catch (err: any) {
        console.log('Container operation error:', {
          statusCode: err?.statusCode,
          message: err?.message
        });
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