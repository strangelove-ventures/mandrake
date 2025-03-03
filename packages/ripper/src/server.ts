#!/usr/bin/env bun
import { FastMCP } from './fastmcp';
import type { SecurityContext } from './types';
import { parseArgs } from 'node:util';

import {
  readFiles,
  writeFile,
  editFile,
  moveFile,
  createDirectory,
  listDirectory,
  tree,
  searchFiles,
  listAllowedDirectories,
  command
} from './tools';

export interface RipperServerConfig {
  name: string;
  version: `${number}.${number}.${number}`;
  transport:
  | { transportType: 'stdio' }
  | {
    transportType: 'sse';
    sse: {
      endpoint: `/${string}`;
      port: number;
    }
  };
  workspaceDir: string;
  additionalDirs: string[];
  excludePatterns: string[];
}

export class RipperServer extends FastMCP {
  private transportConfig: RipperServerConfig['transport'];
  constructor(config: RipperServerConfig) {
    super({
      name: config.name,
      version: config.version
    });

    const securityContext: SecurityContext = {
      allowedDirs: [config.workspaceDir, ...(config.additionalDirs || [])],
      excludePatterns: config.excludePatterns || ['.ws']
    };

    this.addTool(writeFile(securityContext));
    this.addTool(tree(securityContext));
    this.addTool(searchFiles(securityContext));
    this.addTool(readFiles(securityContext));
    this.addTool(moveFile(securityContext));
    this.addTool(listDirectory(securityContext));
    this.addTool(editFile(securityContext));
    this.addTool(createDirectory(securityContext));
    this.addTool(listAllowedDirectories(securityContext));
    this.addTool(command(securityContext));

    this.transportConfig = config.transport;
  }

  async start() {
    await super.start(this.transportConfig);
  }
}

if (require.main === module) {
  const { values } = parseArgs({
    options: {
      transport: { type: 'string', default: 'stdio' },
      workspaceDir: { type: 'string', default: '/ws' },
      excludePatterns: { type: 'string', default: '.ws' }, // Comma separated
      port: { type: 'string' }, // Optional for SSE
      endpoint: { type: 'string' } // Optional for SSE
    }
  })

  const server = new RipperServer({
    name: 'ripper',
    version: '1.0.0',
    transport: values.transport === 'sse' ? {
      transportType: 'sse',
      sse: {
        endpoint: `/${(values.endpoint || 'sse').replace(/^\//, '')}`,
        port: parseInt(values.port || '3000')
      }
    } : { transportType: 'stdio' },
    workspaceDir: values.workspaceDir,
    excludePatterns: values.excludePatterns.split(','),
    additionalDirs: []
  })

  server.start().catch(console.error)
}