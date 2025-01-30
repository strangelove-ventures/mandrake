import { MCPService, ServerConfig, MCPServer, Logger } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerMCPServer } from './server';
import { prepareContainerConfig } from './docker-utils';
import { Tool } from '@mandrake/types';
import { logger as mcpLogger } from '../logger';

const logger = mcpLogger.child({ service: 'docker' });

interface ToolMapping {
  tool: Tool;
  server: MCPServer;
}

export class DockerMCPService implements MCPService {
  private static readonly MANAGED_LABEL = 'mandrake.mcp.managed=true';
  private docker: Docker;
  private servers: Map<string, DockerMCPServer>;
  private serviceLogger: Logger;
  private toolMappings: Map<string, ToolMapping> = new Map();


  constructor(customLogger: Logger = logger) {
    this.serviceLogger = customLogger;
    this.docker = new Docker();
    this.servers = new Map();
  }

  async initialize(configs: ServerConfig[]) {
    await this.cleanup();

    for (const config of configs) {
      try {
        const container = await this.createContainer(config);
        const server = new DockerMCPServer(config, container, this, this.serviceLogger);
        await server.start();
        this.servers.set(config.id, server);

        // Cache tool mappings
        const tools = await server.listTools();
        for (const tool of tools) {
          this.toolMappings.set(tool.name, { tool, server });
        }
      } catch (err: any) {
        await this.cleanup();
        throw err;
      }
    }
  }
  async getTools(): Promise<Tool[]> {
    // Use Array.from to convert Map values to array
    // Then use flatMap to get all tools from all server mappings
    return Array.from(this.toolMappings.values()).map(mapping => mapping.tool);
  }

  getToolServer(toolName: string): ToolMapping | undefined {
    return this.toolMappings.get(toolName);
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
      // First stop all containers and collect cleanup promises
      const cleanupPromises = Array.from(this.servers.values()).map(async (server) => {
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
      });

      // Wait for all cleanup operations to complete
      await Promise.all(cleanupPromises);

      // Add a small delay to allow for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now clear the maps
      this.servers.clear();
      this.toolMappings.clear();

      // Finally look for orphaned containers
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: [DockerMCPService.MANAGED_LABEL] }
      });

      await Promise.all(containers.map(async (c) => {
        try {
          const container = this.docker.getContainer(c.Id);
          await container.stop().catch(() => { }); // Force stop
          await container.remove({ force: true });
        } catch (err: any) {
          if (err?.statusCode !== 404) {
            this.serviceLogger.error('Error cleaning up container', { error: err });
          }
        }
      }));
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