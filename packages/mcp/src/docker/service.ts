import { MCPService, ServerConfig, MCPServer } from '@mandrake/types';
import Docker from 'dockerode';
import { DockerMCPServer } from './server';

export class DockerMCPService implements MCPService {
  private static readonly LABEL_PREFIX = 'mandrake.mcp';
  private static readonly LABELS = {
    MANAGED: `${DockerMCPService.LABEL_PREFIX}.managed`,
    NAME: `${DockerMCPService.LABEL_PREFIX}.name`,
  };

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


  private prepareContainerConfig(config: ServerConfig): Docker.ContainerCreateOptions {
    const labels = {
      [DockerMCPService.LABELS.MANAGED]: 'true',
      [DockerMCPService.LABELS.NAME]: config.name,
      ...config.labels
    };

    return {
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
  }

  /**
   * Creates a new Docker container
   */
  async createContainer(config: ServerConfig): Promise<Docker.Container> {
    // Check/pull image if needed
    const images = await this.docker.listImages({
      filters: { reference: [config.image] }
    });

    if (images.length === 0) {
      await this.docker.pull(config.image);
    }

    // Create with prepared config
    const containerConfig = this.prepareContainerConfig(config);
    return await this.docker.createContainer(containerConfig);
  }
  
  getServer(id: string): MCPServer | undefined {
    return this.servers.get(id);
  }

  getServers(): Map<string, MCPServer> {
    return this.servers;
  }

  async cleanup(): Promise<void> {
    // Stop all known servers
    await Promise.all(
      Array.from(this.servers.values()).map(server =>
        server.stop().catch(err =>
          console.error('Error stopping server:', err))
      )
    );
    this.servers.clear();

    // Remove any containers with our label
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: [`${DockerMCPService.LABELS.MANAGED}=true`]
        }
      });

      await Promise.all(
        containers.map(c =>
          this.docker.getContainer(c.Id)
            .remove({ force: true })
            .catch(err => this.handleDockerError(err))
        )
      );
    } catch (err) {
      console.error('Error cleaning containers:', err);
    }
  }

  private isDockerError(err: any, codes: number[]): boolean {
    return err?.statusCode && codes.includes(err.statusCode);
  }

  private handleDockerError(err: any, ignoreCodes: number[] = [404, 409]): void {
    if (!this.isDockerError(err, ignoreCodes)) {
      throw err;
    }
  }
}