import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCPServer, ServerConfig, Tool, ToolResult } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerTransport } from './transport';
import { DockerMCPService } from './service';
import { retryDockerOperation, isContainerNotFoundError, isContainerConflictError } from './docker-utils';

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

    await retryDockerOperation(async () => {
      try {
        await this.container.remove({ force: true });
      } catch (err) {
        if (!isContainerNotFoundError(err) && !isContainerConflictError(err)) {
          throw err;
        }
      }
    });
  }
  private async ensureContainer(): Promise<void> {
    try {
      const info = await this.container.inspect();
      if (!info.State.Running) {
        await this.container.start();
        // Wait for container to be fully ready
        await this.waitForContainerReady();
      }
    } catch (err: any) {
      if (err?.statusCode === 404) {
        this.container = await this.service.createContainer(this.config);
        await this.container.start();
        // Wait for container to be ready here too
        await this.waitForContainerReady();
      } else {
        throw err;
      }
    }
  }

  private async waitForContainerReady(): Promise<void> {
    console.log(`[${this.config.id}] Waiting for container ready...`);
    let retries = 3;
    while (retries > 0) {
      try {
        const info = await this.container.inspect();
        console.log(`[${this.config.id}] Container state:`, {
          running: info.State.Running,
          status: info.State.Status,
          health: info.State.Health?.Status
        });

        if (!info.State.Running) {
          // Add this to see why container exited
          const logs = await this.container.logs({
            stdout: true,
            stderr: true,
            tail: 50
          });
          console.log(`[${this.config.id}] Container logs:`, logs.toString());
        }

        // Check both running state and health check if available
        if (info.State.Running &&
          (!info.State.Health || info.State.Health.Status === 'healthy')) {

          // Try a test exec to verify container is ready
          const exec = await this.container.exec({
            AttachStderr: true,
            AttachStdout: true,
            Cmd: ['true'] // Simple command just to test exec
          });

          // Start exec just to verify it works
          const stream = await exec.start({
            hijack: true,
          });

          // Clean up test exec
          stream.destroy();

          return;
        }
      } catch (err: any) {
        console.error(`[${this.config.id}] Container ready check failed:`, err);

        // Add logs here to see what's happening when we get errors
        try {
          const logs = await this.container.logs({
            stdout: true,
            stderr: true,
            tail: 50
          });
          console.log(`[${this.config.id}] Container logs during failure:`, logs.toString());
        } catch (logErr) {
          console.error(`[${this.config.id}] Failed to get logs:`, logErr);
        }

        if (retries === 1) throw err;
      }

      retries--;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Container failed to reach ready state');
  }

  private async ensureClient(): Promise<void> {
    console.log(`[${this.config.id}] Ensuring client...`);
    await retryDockerOperation(async () => {
      try {
        console.log(`[${this.config.id}] Creating transport...`);
        this.transport = new DockerTransport(this.container, this.config.execCommand);
        console.log(`[${this.config.id}] Creating client...`);
  
        this.client = new Client(
          SERVER_CONFIG.client.info,
          SERVER_CONFIG.client.options
        );
        console.log(`[${this.config.id}] Connecting client...`);
        await this.client.connect(this.transport);
        console.log(`[${this.config.id}] Client connected successfully`);
      } catch (err) {
        console.error(`[${this.config.id}] Client connection failed:`, err);
        // Add logs here to debug what the container is doing
        try {
          const logs = await this.container.logs({
            stdout: true,
            stderr: true,
            tail: 50
          });
          console.log(`[${this.config.id}] Container logs during client failure:`, logs.toString());
        } catch (logErr) {
          console.error(`[${this.config.id}] Failed to get logs:`, logErr);
        }
        throw err;
      }
    });
  }
}