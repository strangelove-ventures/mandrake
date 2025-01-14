import Docker from 'dockerode';
import { ServerConfig } from './types';
import { MCPServer } from './server';

/**
 * Manages multiple MCP server instances running in Docker containers.
 * Handles container lifecycle, cleanup, and server tracking.
 */
export class MCPServerManager {
  private static LABEL_PREFIX = 'mandrake.mcp';
  private docker: Docker;
  private servers: Map<string, MCPServer>;

  constructor() {
    this.docker = new Docker();
    this.servers = new Map();
  }

  /**
   * Creates a new Docker container for an MCP server
   */
  private async createContainer(config: ServerConfig): Promise<Docker.Container> {
    // Check/pull image
    const images = await this.docker.listImages({
      filters: { reference: [config.image] }
    });

    if (images.length === 0) {
      console.log(`Pulling image ${config.image}...`);
      await this.docker.pull(config.image);
    }

    // Base labels for tracking
    const labels = {
      [`${MCPServerManager.LABEL_PREFIX}.managed`]: 'true',
      [`${MCPServerManager.LABEL_PREFIX}.name`]: config.name,
      ...config.labels
    };

    // Create container
    console.log('Creating container...');
    return this.docker.createContainer({
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
    });
  }

  /**
   * Starts a new MCP server with the given configuration
   */
  async startServer(config: ServerConfig): Promise<MCPServer> {
    const container = await this.createContainer(config);
    const server = new MCPServer(config, container);

    try {
      await server.start();
      this.servers.set(container.id, server);
      return server;
    } catch (err) {
      // Cleanup on failure
      await container.remove({ force: true }).catch(console.error);
      throw err;
    }
  }

  /**
   * Stops and removes the server with the given ID
   */
  async stopServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) return;

    await server.stop();
    this.servers.delete(id);
  }

  /**
   * Stops and removes the server with the given ID,
   * including its container
   */
  async removeServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) return;

    await server.remove();
    this.servers.delete(id);
  }

  /**
   * Gets a server by ID
   */
  getServer(id: string): MCPServer | undefined {
    return this.servers.get(id);
  }

  /**
   * Lists all managed servers
   */
  async listServers(): Promise<MCPServer[]> {
    return Array.from(this.servers.values());
  }

  /**
   * Cleanup all managed servers and containers
   */
  async cleanup(): Promise<void> {
    // Stop all running servers
    await Promise.all(Array.from(this.servers.values()).map(s => s.stop()));
    this.servers.clear();

    // Find and remove any orphaned containers
    const containers = await this.docker.listContainers({
      all: true,
      filters: {
        label: [`${MCPServerManager.LABEL_PREFIX}.managed=true`]
      }
    });

    await Promise.all(containers.map(async c => {
      const container = this.docker.getContainer(c.Id);
      try {
        if (c.State === 'running') {
          await container.stop();
        }
        await container.remove({ force: true });
      } catch (err) {
        console.error('Error cleaning up container:', c.Id, err);
      }
    }));
  }

  /**
   * Gets all managed container IDs by label
   */
  async listManagedContainers(): Promise<Docker.ContainerInfo[]> {
    return this.docker.listContainers({
      all: true,
      filters: {
        label: [`${MCPServerManager.LABEL_PREFIX}.managed=true`]
      }
    });
  }
}
