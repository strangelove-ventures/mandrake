import { TypedEmitter } from 'tiny-typed-emitter';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import Docker from 'dockerode';

import { ServerConfig, ServerState, ServerEvents } from './types';
import { DockerTransport } from './transport';

/**
 * Manages a single MCP server instance running in a Docker container
 */
export class MCPServer extends TypedEmitter<ServerEvents> {
  private state: ServerState;
  private healthCheckTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempts = 0;

  constructor(
    private config: ServerConfig,
    private container: Docker.Container
  ) {
    super();
    this.state = {
      id: container.id,
      status: 'creating',
      health: {
        healthy: false,
        lastCheck: new Date()
      },
      container
    };
  }

  private setState(update: Partial<ServerState>) {
    this.state = { ...this.state, ...update };
    this.emit('stateChange', this.state);
  }

  private async checkHealth(): Promise<void> {
    try {
      const containerInfo = await this.container.inspect();
      const wasHealthy = this.state.health.healthy;
      
      // Check container is running
      let healthy = containerInfo.State.Running && 
        !containerInfo.State.Restarting &&
        !containerInfo.State.Paused;

      // Check MCP connection
      if (healthy && this.state.client) {
        try {
          await this.state.client.ping();
        } catch (err) {
          healthy = false;
        }
      }

      this.state.health = {
        healthy,
        lastCheck: new Date(),
        lastError: healthy ? undefined : new Error('Health check failed')
      };

      this.emit('healthChange', this.state.health);

      // If we've become unhealthy and auto-restart is enabled
      if (wasHealthy && !healthy && this.config.autoRestart) {
        this.handleUnhealthy();
      }
    } catch (err) {
      this.state.health = {
        healthy: false,
        lastCheck: new Date(),
        lastError: err as Error
      };
      this.emit('healthChange', this.state.health);
      this.emit('error', err as Error);
    }
  }

  private async handleUnhealthy() {
    if (this.reconnectTimer || this.state.status !== 'running') return;

    this.reconnectAttempts++;
    if (this.reconnectAttempts > (this.config.healthCheck?.maxRetries ?? 3)) {
      this.setState({ status: 'error', error: new Error('Max reconnection attempts reached') });
      return;
    }

    // Exponential backoff for reconnect
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.restart();
        this.reconnectAttempts = 0;
      } catch (err) {
        this.emit('error', err as Error);
      } finally {
        this.reconnectTimer = undefined;
      }
    }, delay);
  }

  startHealthCheck() {
    if (this.healthCheckTimer || !this.config.healthCheck) return;
    
    this.healthCheckTimer = setInterval(
      () => this.checkHealth(),
      this.config.healthCheck.interval
    );
  }

  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  async start(): Promise<void> {
    try {
      this.setState({ status: 'starting' });

      console.log('Starting container...');
      await this.container.start();

      console.log('Creating transport...');
      const transport = new DockerTransport(
        this.container,
        this.config.execCommand // Pass just what's needed for exec
      );

      console.log('Creating client...');
      const client = new Client(
        { name: `mandrake-client-${this.config.name}`, version: '0.1.0' },
        { capabilities: { tools: true } }
      );

      // Connect transport & client
      console.log('Connecting...');
      await transport.start();
      await client.connect(transport);
      console.log('Client connected successfully');

      this.state.transport = transport;
      this.state.client = client;
      this.setState({ status: 'running' });

      // Start health checking if configured
      if (this.config.healthCheck) {
        this.startHealthCheck();
      }
    } catch (err) {
      console.error('Start error:', {
        error: err,
        containerInfo: await this.container.inspect()
      });
      this.setState({ 
        status: 'error',
        error: err as Error
      });
      throw err;
    }
  }

  async stop(): Promise<void> {
    this.setState({ status: 'stopping' });
    this.stopHealthCheck();

    try {
      // Close MCP connection
      if (this.state.client) {
        await this.state.client.close();
      }
      if (this.state.transport) {
        await this.state.transport.close();
      }

      // Stop container
      await this.container.stop();
      this.setState({ status: 'stopped' });
    } catch (err) {
      this.setState({ 
        status: 'error',
        error: err as Error
      });
      throw err;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async remove(): Promise<void> {
    await this.stop();
    await this.container.remove();
  }

  getState(): ServerState {
    return { ...this.state };
  }

  async callTool(name: string, args: any): Promise<any> {
    if (!this.state.client || this.state.status !== 'running') {
      throw new Error('Server not running');
    }
    return this.state.client.callTool({ name, arguments: args });
  }
}