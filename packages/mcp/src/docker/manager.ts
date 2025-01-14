import Docker from 'dockerode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface ServerConfig {
  name: string;
  image: string;
  volumes?: {
    source: string;
    target: string;
  }[];
  env?: Record<string, string>;
}

class DockerTransport extends StdioClientTransport {
  constructor(private container: Docker.Container) {
    super({
      command: 'docker',
      args: ['exec', '-i', container.id, '/app/dist/index.js', '/data'],
      stderr: 'pipe'  // Change to pipe so we can see stderr output
    } as StdioServerParameters);
  }
}

interface MCPServerConnection {
  container: Docker.Container;
  client: Client;
  transport: DockerTransport;
  config: ServerConfig;
}

export class MCPServerManager {
  private static LABEL_PREFIX = 'mandrake.mcp';
  private docker: Docker;
  private servers: Map<string, MCPServerConnection>;

  constructor() {
    this.docker = new Docker();
    this.servers = new Map();
  }

  async startServer(config: ServerConfig): Promise<string> {
    // Check if image exists locally first
    const images = await this.docker.listImages({
      filters: { reference: [config.image] }
    });

    if (images.length === 0) {
      await this.docker.pull(config.image).catch(err => {
        console.error(`Failed to pull image ${config.image}:`, err);
        throw err;
      });
    }

    const labels = {
      [`${MCPServerManager.LABEL_PREFIX}.type`]: config.name,
      [`${MCPServerManager.LABEL_PREFIX}.managed`]: 'true'
    };

    // Create container with labels instead of fixed name
    const container = await this.docker.createContainer({
      Image: config.image,
      Labels: labels,
      Env: config.env ? Object.entries(config.env).map(([k, v]) => `${k}=${v}`) : [],
      HostConfig: {
        Binds: config.volumes?.map(v => `${v.source}:${v.target}`) || [],
        AutoRemove: false, // Ensure we can inspect logs after exit
        LogConfig: {
          Type: 'json-file',
          Config: {
            'max-size': '10m'
          }
        }
      }
    });

    // Start container and set up debug logging
    await container.start();
    
    // Create transport with debugging
    const transport = new DockerTransport(container);
    
    // Set up transport event handlers
    transport.onerror = (error: Error) => {
      console.error(`Transport error for ${config.name}:${container.id}:`, error);
    };

    transport.onclose = () => {
      console.log(`Transport closed for ${config.name}:${container.id}`);
    };

    // Set up stderr logging if available
    transport.stderr?.on('data', (chunk) => {
      console.error(`[${config.name}:${container.id}] stderr: ${chunk.toString()}`);
    });

    const client = new Client(
      { name: `mandrake-client-${config.name}`, version: '0.1.0' },
      { capabilities: { tools: true } }
    );

    try {
      await transport.start();  // Explicitly start the transport
      await client.connect(transport);
    } catch (err) {
      // If connection fails, get container logs for debugging
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        timestamps: true,
        tail: 50
      });
      console.error(`Failed to connect to ${config.name}:${container.id}. Container logs:`, logs.toString());
      throw err;
    }

    this.servers.set(container.id, {
      container,
      client,
      transport,
      config
    });

    return container.id;
  }

  async stopServer(containerId: string): Promise<void> {
    const connection = this.servers.get(containerId);
    if (!connection) return;

    try {
      await connection.client.close();
      await connection.transport.close();
      await connection.container.stop();
      await connection.container.remove();
    } catch (err) {
      console.error(`Error stopping server ${containerId}:`, err);
    }
    
    this.servers.delete(containerId);
  }

  async listServers(): Promise<string[]> {
    return Array.from(this.servers.keys());
  }

  // Client communication methods
  async listServerTools(containerId: string) {
    const conn = this.servers.get(containerId);
    if (!conn) throw new Error(`Server ${containerId} not found`);
    return conn.client.listTools();
  }

  async callServerTool(containerId: string, tool: string, args: any) {
    const conn = this.servers.get(containerId);
    if (!conn) throw new Error(`Server ${containerId} not found`);
    return conn.client.callTool({ 
      name: tool, 
      arguments: args 
    });
  }

  // Helper to check server health
  async isServerHealthy(containerId: string): Promise<boolean> {
    const conn = this.servers.get(containerId);
    if (!conn) return false;

    try {
      await conn.client.ping();
      return true;
    } catch (err) {
      return false;
    }
  }

  // Helper to inspect container state
  async getContainerState(containerId: string) {
    const connection = this.servers.get(containerId);
    if (!connection) throw new Error(`Server ${containerId} not found`);
    
    const state = await connection.container.inspect();
    return {
      running: state.State.Running,
      exitCode: state.State.ExitCode,
      startedAt: state.State.StartedAt,
      finishedAt: state.State.FinishedAt,
      error: state.State.Error
    };
  }

  // Helper to get managed containers by label
  async listManagedContainers(): Promise<Docker.ContainerInfo[]> {
    return this.docker.listContainers({
      all: true,
      filters: {
        label: [`${MCPServerManager.LABEL_PREFIX}.managed=true`]
      }
    });
  }

  async cleanupOrphanedContainers(): Promise<void> {
    const containers = await this.listManagedContainers();

    await Promise.all(containers.map(async (container) => {
      const cont = this.docker.getContainer(container.Id);
      if (container.State === 'running') {
        await cont.stop();
      }
      await cont.remove({ force: true });
    }));
  }
}