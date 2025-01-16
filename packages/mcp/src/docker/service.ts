import { MCPService, ServerConfig, MCPServer } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerMCPServer } from './server';

export class DockerMCPService implements MCPService {
  private static LABEL_PREFIX = 'mandrake.mcp';
  private docker: Docker;
  private servers: Map<string, DockerMCPServer>;

  constructor() {
    this.docker = new Docker();
    this.servers = new Map();
  }

  /**
   * Creates a new Docker container
   */
  async createContainer(config: ServerConfig): Promise<Docker.Container> {
    // Check/pull image
    const images = await this.docker.listImages({
      filters: { reference: [config.image] }
    });

    if (images.length === 0) {
      await this.docker.pull(config.image);
    }

    // Base labels for tracking
    const labels = {
      [`${DockerMCPService.LABEL_PREFIX}.managed`]: 'true',
      [`${DockerMCPService.LABEL_PREFIX}.name`]: config.name,
      ...config.labels
    };

    // Map our config to Docker container options
    const containerConfig = {
      Image: config.image,
      Entrypoint: config.entrypoint,
      Cmd: config.command,
      Env: config.env ? Object.entries(config.env).map(([k, v]) => `${k}=${v}`) : [],
      Labels: labels,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: true,
      StdinOnce: false,
      Tty: false,
      HostConfig: {
        Privileged: config.privileged,
        AutoRemove: false,
        Binds: config.volumes?.map(v => `${v.source}:${v.target}:${v.mode || 'rw'}`),
        ...config.hostConfig,
      }
    };

    return await this.docker.createContainer(containerConfig);
  }

  async initialize(configs: ServerConfig[]): Promise<void> {
    // Clean start
    await this.cleanup();

    // Start each server sequentially - more stable than parallel
    for (const config of configs) {
      try {
        const container = await this.createContainer(config);
        const server = new DockerMCPServer(config, container, this);
        await server.start();
        this.servers.set(config.id, server);
      } catch (err) {
        await this.cleanup();
        throw err;
      }
    }
  }
  
  getServer(id: string): MCPServer | undefined {
    return this.servers.get(id);
  }

  getServers(): Map<string, MCPServer> {
    return this.servers;
  }

  async cleanup(): Promise<void> {
    // Force stop/remove all known servers
    await Promise.all(
      Array.from(this.servers.values()).map(async (server) => {
        try {
          await server.stop();  // Now includes force removal
        } catch (err) {
          console.error('Error stopping server:', err);
        }
      })
    );
    this.servers.clear();

    // Force remove any orphaned containers with our label
    try {
      const containers = await this.docker.listContainers({
        all: true,  // Include stopped containers
        filters: {
          label: [`${DockerMCPService.LABEL_PREFIX}.managed=true`]
        }
      });

      await Promise.all(
        containers.map(async c => {
          try {
            await this.docker.getContainer(c.Id).remove({ force: true });
          } catch (err: any) {
            // Ignore 404 (not found) and 409 (removal in progress) errors
            if (err?.statusCode !== 404 && err?.statusCode !== 409) {
              console.error('Error removing container:', err);
            }
          }
        })
      );
    } catch (err) {
      console.error('Error in orphan cleanup:', err);
    }
  }
}