import { type Logger } from '@mandrake/utils';
import Docker from 'dockerode';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export type ServerConfig = {
  image: string;
  id: string;
  name: string;
  command?: string[];
  execCommand?: string[];
  volumes?: {
    source: string;
    target: string;
    mode: 'ro' | 'rw';
  }[];
}

// From old docker-utils.ts
function prepareContainerConfig(config: ServerConfig): Docker.ContainerCreateOptions {
  return {
    Image: config.image,
    name: config.id,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    OpenStdin: true,
    StdinOnce: false,
    Tty: false,
    Labels: {
      'mandrake.mcp.managed': 'true',
      'mandrake.mcp.name': config.name
    },
    HostConfig: {
      AutoRemove: true,
      Binds: config.volumes?.map(v => `${v.source}:${v.target}:${v.mode}`),
    }
  };
}

/**
 * Manages Docker container lifecycle for MCP servers
 */
export class DockerContainer {
  private docker: Docker;
  private container?: Docker.Container;
  private _isStarted = false;
  public config: ServerConfig;

  constructor(
    private cfg: ServerConfig,
    private logger: Logger,
  ) {
    this.config = cfg;
    this.docker = new Docker();
    this.logger = logger.child({ meta: { service: 'docker-container' }});
  }

  /**
   * Ensures image is available locally
   */
  async ensureImage(): Promise<void> {
    try {
      await this.docker.getImage(this.config.image).inspect();
    } catch (err) {
      if ((err as any)?.statusCode === 404) {
        this.logger.debug('Pulling image', { meta: { image: this.config.image }});
        await this.docker.pull(this.config.image);
        this.logger.debug('Image pulled successfully');
      } else {
        throw err;
      }
    }
  }

  /**
   * Creates and starts container. If container exists, ensures it's in correct state.
   */
  async start(): Promise<void> {
    this.logger.debug('Starting container', { meta: { config: this.config }});

    try {
      // Create if doesn't exist
      if (!this.container) {
        this.container = await this.docker.createContainer(prepareContainerConfig(this.config));
      }

      await this.ensureContainer();
      this._isStarted = true;
      this.logger.debug('Container started successfully');
    } catch (err) {
      this.logger.error('Failed to start container', { meta: { error: err }});
      throw new McpError(
        ErrorCode.InternalError,
        `Container start failed: ${(err as Error).message}`
      );
    }
  }

  /**
   * Stops and removes container
   */
  async cleanup(): Promise<void> {
    if (!this.container) return;

    this.logger.debug('Cleaning up container');
    
    try {
      // First kill the container to prevent more messages
      try {
        await this.container.kill().catch(() => { });
      } catch (err) {
        this.logger.error('Error killing container', { meta: { error: err }});
      }

      // Give a moment for any in-flight operations
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        await this.container.remove({ force: true });
      } catch (removeErr) {
        if ((removeErr as any)?.statusCode !== 404) {
          throw removeErr;
        }
      }

      this._isStarted = false;
      this.container = undefined;
      
      this.logger.debug('Container cleanup successful');
    } catch (err) {
      if ((err as any)?.statusCode === 404) {
        // Container already gone, that's fine
        this.logger.debug('Container already removed');
        this._isStarted = false;
        this.container = undefined;
        return;
      }

      this.logger.error('Container cleanup failed', { meta: { error: err }});
      throw new McpError(
        ErrorCode.InternalError,
        `Container cleanup failed: ${(err as Error).message}`
      );
    }
  }

  /**
   * Returns the underlying Docker container
   */
  getContainer(): Docker.Container | undefined {
    return this.container;
  }

  /**
   * Checks if container is started
   */
  isStarted(): boolean {
    return this._isStarted;
  }

  /**
   * Returns the config used to create this container
   */
  getConfig(): ServerConfig {
    return this.config;
  }

  private async ensureContainer(): Promise<void> {
    try {
      const info = await this.container!.inspect();
      if (!info.State.Running) {
        await this.container!.start();
        await this.waitForContainerReady();
      }
    } catch (err: any) {
      if (err?.statusCode === 404) {
        this.container = await this.docker.createContainer(prepareContainerConfig(this.config));
        await this.container.start();
        await this.waitForContainerReady();
      } else {
        throw err;
      }
    }
  }

  private async waitForContainerReady(): Promise<void> {
    this.logger.debug('Waiting for container ready...', { meta: { id: this.config.id }});
    let retries = 3;
    while (retries > 0) {
      try {
        const info = await this.container!.inspect();
        this.logger.debug('Container state', {
          meta: {
            id: this.config.id,
            state: {
              running: info.State.Running,
              status: info.State.Status,
              health: info.State.Health?.Status
            }
          }
        });

        if (!info.State.Running) {
          // Add this to see why container exited
          const logs = await this.container!.logs({
            stdout: true,
            stderr: true,
            tail: 50
          });
          this.logger.debug('Container logs', {
            meta: {
              id: this.config.id,
              logs: logs.toString()
            }
          });
        }

        // Check both running state and health check if available
        if (info.State.Running &&
          (!info.State.Health || info.State.Health.Status === 'healthy')) {

          // Try a test exec to verify container is ready
          const exec = await this.container!.exec({
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
        this.logger.error('Container ready check failed', {
          meta: {
            id: this.config.id,
            error: err
          }
        });

        // Add logs here to see what's happening when we get errors
        try {
          const logs = await this.container!.logs({
            stdout: true,
            stderr: true,
            tail: 50
          });
          this.logger.debug('Container logs during failure', {
            meta: {
              id: this.config.id,
              logs: logs.toString()
            }
          });
        } catch (logErr) {
          this.logger.error('Failed to get logs', {
            meta: {
              id: this.config.id,
              error: logErr
            }
          });
        }

        if (retries === 1) throw err;
      }

      retries--;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new McpError(ErrorCode.InternalError, 'Container failed to reach ready state');
  }
}