import { FastMCP } from 'fastmcp';
import type { Context } from './types';

import {
  readFiles,
  writeFile,
  editFile,
  moveFile,
  createDirectory,
  listDirectory,
  tree,
  searchFiles,
  listAllowedDirectories
} from './tools';

const tools = {
  readFiles,
  writeFile,
  editFile,
  moveFile,
  createDirectory,
  listDirectory,
  tree,
  searchFiles,
  listAllowedDirectories
}

export interface RipperServerConfig {
  name: string;
  version: `${number}.${number}.${number}`;
  transport: {
    type: 'stdio' | 'sse';
    sse?: {
      endpoint: `/${string}`;
      port: number;
    };
  };
  // Default workspace directory
  workspaceDir: string;
  // Additional allowed directories
  additionalDirs: string[];
  // Default exclude patterns
  excludePatterns: string[];
}

export class RipperServer {
  private server: FastMCP;
  private config: RipperServerConfig;
  private allowedDirs: string[];
  private excludePatterns: string[];

  constructor(config: RipperServerConfig) {
    this.config = {
      name: config.name || 'ripper',
      version: config.version || '1.0.0',
      transport: config.transport,
      workspaceDir: config.workspaceDir || '/ws',
      excludePatterns: config.excludePatterns || ['.ws'],
      additionalDirs: config.additionalDirs || []
    };

    // Set up allowed directories
    this.allowedDirs = [
      this.config.workspaceDir as string,
      ...(config.additionalDirs || [])
    ];

    this.excludePatterns = this.config.excludePatterns as string[];

    this.server = new FastMCP({
      name: this.config.name as string,
      version: this.config.version as `${number}.${number}.${number}`
    });

    // Register all tools with injected allowedDirs
    Object.values(tools).forEach(tool => {
      this.server.addTool({
        description: tool.description,
        name: tool.name,
        parameters: tool.parameters,
        execute: (args: any, context: Context) => {
          // Inject allowedDirs into each tool call
          const argsWithAllowed = {
            ...args,
            allowedDirs: this.allowedDirs,
            // If the tool accepts excludePatterns and none were provided, use defaults
            // TODO: fix
            ...(tool.parameters.shape && !args.excludePatterns && {
              excludePatterns: this.excludePatterns
            })
          };
          return tool.execute(argsWithAllowed, context);
        },
      });
    });
  }

  async start() {
    if (this.config.transport.type === 'sse' && this.config.transport.sse) {
      await this.server.start({
        transportType: 'sse',
        sse: {
          endpoint: this.config.transport.sse.endpoint,
          port: this.config.transport.sse.port
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
    name: 'ripper',
    version: '1.0.0',
    additionalDirs: [],
    transport: { type: 'stdio' },
    workspaceDir: '/ws',
    excludePatterns: ['.ws']
  });
  server.start().catch(console.error);
}