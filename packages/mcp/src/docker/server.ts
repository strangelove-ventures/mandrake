import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCPServer, ServerConfig, Tool, ToolResult, Logger } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerTransport } from './transport';
import { DockerMCPService } from './service';
import { retryDockerOperation, isContainerNotFoundError } from './docker-utils';
import { SERVER_CONFIG } from './config';

export enum ServerStatus {
  STARTING = 'starting',
  READY = 'ready',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

export class DockerMCPServer implements MCPServer {
  private client?: Client;
  private transport?: DockerTransport;
  private serverLogger: Logger;
  // private _cleaned = false;
  private _cleanupStarted = false;
  private cleanupPromise?: Promise<void>;
  private status: ServerStatus = ServerStatus.STOPPED;

  
  
  constructor(
    private config: ServerConfig,
    private container: Docker.Container,
    private service: DockerMCPService,
    serviceLogger: Logger
  ) { this.serverLogger = serviceLogger.child({service: this.config.id}); }
  
  getId(): string {
    return this.config.id;
  }
  getStatus(): ServerStatus {
    return this.status;
  }
  getName(): string {
    return this.config.name;
  }

  async start(): Promise<void> {
    if (this.status !== ServerStatus.STOPPED) {
      throw new Error('Server must be stopped before starting');
    }

    this.status = ServerStatus.STARTING;
    try {
      await this.ensureContainer();
      await this.ensureClient();
      await this.client!.ping();
      this.status = ServerStatus.READY;
    } catch (err) {
      this.status = ServerStatus.ERROR;
      await this.cleanup();
      throw err;
    }
  }

  async stop(): Promise<void> {
    await this.cleanup();
  }

  // Removing restart since it's just a composition that could live at service level

  async listTools(): Promise<Tool[]> {
    // Block new operations during cleanup
    if (this._cleanupStarted) {
      throw new Error('Server is shutting down');
    }
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
    return !this._cleanupStarted && !!this.client && !!this.transport;
  }
  // in DockerMCPServer

  private async cleanup(): Promise<void> {
    if (this.cleanupPromise) return this.cleanupPromise;

    // Block any new operations immediately
    this._cleanupStarted = true;
    this.status = ServerStatus.STOPPING;

    this.cleanupPromise = (async () => {
      // First kill the container to prevent more messages
      try {
        await this.container.kill().catch(() => { });
      } catch (err) {
        this.serverLogger.error('Error killing container', { error: err });
      }

      // Give a moment for any in-flight operations
      await new Promise(resolve => setTimeout(resolve, 100));

      if (this.client) {
        // Now let SDK clean up
        await this.client.close();
        this.client = undefined;
        this.transport = undefined;
      }

      // Finally cleanup container
      await retryDockerOperation(async () => {
        try {
          await this.container.remove({ force: true });
        } catch (err) {
          if (!isContainerNotFoundError(err)) {
            throw err;
          }
        }
      });
    })();
    
    this.status = ServerStatus.STOPPED;
    return this.cleanupPromise;
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
    this.serverLogger.info('Waiting for container ready...', { id: this.config.id });
    let retries = 3;
    while (retries > 0) {
      try {
        const info = await this.container.inspect();
        this.serverLogger.debug('Container state', {
          id: this.config.id,
          state: {
            running: info.State.Running,
            status: info.State.Status,
            health: info.State.Health?.Status
          }
        });

        if (!info.State.Running) {
          // Add this to see why container exited
          const logs = await this.container.logs({
            stdout: true,
            stderr: true,
            tail: 50
          });
          this.serverLogger.debug('Container logs', {
            id: this.config.id,
            logs: logs.toString()
          });        }

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
        this.serverLogger.error('Container ready check failed', {
          id: this.config.id,
          error: err
        });

        // Add logs here to see what's happening when we get errors
        try {
          const logs = await this.container.logs({
            stdout: true,
            stderr: true,
            tail: 50
          });
          this.serverLogger.debug('Container logs during failure', {
            id: this.config.id,
            logs: logs.toString()
          });
        } catch (logErr) {
          this.serverLogger.error('Failed to get logs', {
            id: this.config.id,
            error: logErr
          });
        }

        if (retries === 1) throw err;
      }

      retries--;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Container failed to reach ready state');
  }

  private async ensureClient(): Promise<void> {
    this.serverLogger.info('Ensuring client', { id: this.config.id });
    await retryDockerOperation(async () => {
      try {
        this.serverLogger.debug('Creating transport', { id: this.config.id });
        this.transport = new DockerTransport(this.container, this.serverLogger, this.config.execCommand);
        this.serverLogger.debug('Creating client', { id: this.config.id });
  
        this.client = new Client(
          SERVER_CONFIG.client.info,
          SERVER_CONFIG.client.options
        );
        this.serverLogger.debug('Connecting client', { id: this.config.id });
        await this.client.connect(this.transport);
        this.serverLogger.info('Client connected successfully', { id: this.config.id });
      } catch (err) {
        this.serverLogger.error('Client connection failed', {
          id: this.config.id,
          error: err
        });
        // Add logs here to debug what the container is doing
        try {
          const logs = await this.container.logs({
            stdout: true,
            stderr: true,
            tail: 50
          });
          this.serverLogger.debug('Container logs during client failure', {
            id: this.config.id,
            logs: logs.toString()
          });
        } catch (logErr) {
          this.serverLogger.error('Failed to get logs', {
            id: this.config.id,
            error: logErr
          });
        }
        throw err;
      }
    });
  }
}