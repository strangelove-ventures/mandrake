import { MCPService, ServerConfig, MCPServer, Logger } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerMCPServer } from './server';
import { prepareContainerConfig } from './docker-utils';
import { logger as mcpLogger } from '../logger';

const logger = mcpLogger.child({ service: 'docker' });


export class DockerMCPService implements MCPService {
  private static readonly MANAGED_LABEL = 'mandrake.mcp.managed=true';
  private docker: Docker;
  private servers: Map<string, DockerMCPServer>;
  private serviceLogger: Logger;

  constructor(customLogger: Logger = logger) {
    this.serviceLogger = customLogger;
    this.docker = new Docker();
    this.servers = new Map();
  }

  async initialize(configs: ServerConfig[]): Promise<void> {
    await this.cleanup();

    for (const config of configs) {
      try {
        const container = await this.createContainer(config);
        const server = new DockerMCPServer(config, container, this, this.serviceLogger);
        await server.start();
        this.servers.set(config.id, server);
      } catch (err: any) {
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
      // First stop all containers before removing
      for (const server of this.servers.values()) {
        try {
          const container = await server.getInfo();
          if (container.State.Running) {
            await server.stop();
          }
        } catch (err) {
          // Ignore 404 errors
          if ((err as any)?.statusCode !== 404) {
            this.serviceLogger.error('Error stopping container', { error: err });
          }
        }
      }

      this.servers.clear();

      // Then look for any orphaned containers
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: [DockerMCPService.MANAGED_LABEL] }
      });

      for (const c of containers) {
        try {
          const container = this.docker.getContainer(c.Id);
          // Force stop first
          await container.stop().catch(() => { });
          // Then remove
          await container.remove({ force: true });
        } catch (err: any) {
          // Only log non-404 errors
          if (err?.statusCode !== 404) {
            this.serviceLogger.error('Error cleaning up container', { error: err });
          }
        }
      }
    } catch (err) {
      this.serviceLogger.error('Cleanup error', { error: err });
    }
  }

  getServer(id: string): MCPServer | undefined {
    return this.servers.get(id);
  }

  getServers(): Map<string, MCPServer> {
    return this.servers;
  }
}