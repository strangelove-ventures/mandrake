import { FastMCP } from 'fastmcp';
import * as tools from './tools';

export interface RipperServerConfig {
  name?: string;
  version?: string;
  transportType: 'stdio' | 'sse';
  sseConfig?: {
    endpoint: string;
    port: number;
  };
}

export class RipperServer {
  private server: FastMCP;

  constructor(config: RipperServerConfig) {
    this.server = new FastMCP({
      name: config.name || 'ripper',
      version: config.version || '1.0.0'
    });

    // Register all tools
    Object.values(tools).forEach(tool => {
      this.server.addTool(tool);
    });
  }

  async start() {
    if (this.config.transportType === 'sse' && this.config.sseConfig) {
      await this.server.start({
        transportType: 'sse',
        sse: {
          endpoint: this.config.sseConfig.endpoint,
          port: this.config.sseConfig.port
        }
      });
    } else {
      await this.server.start({
        transportType: 'stdio'
      });
    }
  }

  async stop() {
    await this.server.stop();
  }
}

// Create default server if running as main
if (require.main === module) {
  const server = new RipperServer({
    transportType: 'stdio'
  });
  server.start().catch(console.error);
}