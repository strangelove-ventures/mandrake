import { MCPService, ServerConfig, MCPServer } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerMCPServer } from './server';
import { handleDockerError, prepareContainerConfig, IGNORE_CODES } from './docker-utils';

export class DockerMCPService implements MCPService {
  private static readonly MANAGED_LABEL = 'mandrake.mcp.managed=true';
  private docker: Docker;
  private servers: Map<string, DockerMCPServer>;

  constructor() {
    this.docker = new Docker();
    this.servers = new Map();
  }

  async initialize(configs: ServerConfig[]): Promise<void> {
    await this.cleanup();

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

  async createContainer(config: ServerConfig): Promise<Docker.Container> {
    try {
      const images = await this.docker.listImages({
        filters: { reference: [config.image] }
      });

      if (images.length === 0) {
        await this.docker.pull(config.image);
      }

      return await this.docker.createContainer(prepareContainerConfig(config));
    } catch (err) {
      // Don't ignore any Docker errors during container creation
      throw err;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Stop all known servers
      await Promise.all(
        Array.from(this.servers.values())
          .map(server => server.stop().catch(err => handleDockerError(err)))
      );
      this.servers.clear();

      // Cleanup orphaned containers
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: [DockerMCPService.MANAGED_LABEL] }
      });

      await Promise.all(
        containers.map(c =>
          this.docker.getContainer(c.Id)
            .remove({ force: true })
            .catch(err => handleDockerError(err)))
      );
    } catch (err) {
      console.error('Cleanup error:', err);
      // Don't throw cleanup errors
    }
  }

  getServer(id: string): MCPServer | undefined {
    return this.servers.get(id);
  }

  getServers(): Map<string, MCPServer> {
    return this.servers;
  }
}