import { FastMCP } from 'fastmcp';
import type { RipperOptions } from './types';

import { readFile } from './tools/read_file';
import { writeFile } from './tools/write_file';
import { searchFiles } from './tools/search_files';
import { listDirectory } from './tools/list_directory';
import { getCodeDefinitions } from './tools/get_code_definitions';
import { executeCommand } from './tools/execute_command';

export class RipperServer {
  private server: FastMCP;
  private options: RipperOptions;

  constructor(options: RipperOptions = {}) {
    this.options = options;
    this.server = new FastMCP({
      name: 'ripper',
      version: '0.1.0'
    });

    this.setupTools();
  }

  private setupTools() {
    const ctx = { server: this.server, options: this.options };

    // Add each tool
    this.server.addTool(readFile(ctx));
    this.server.addTool(writeFile(ctx));
    this.server.addTool(searchFiles(ctx));
    this.server.addTool(listDirectory(ctx));
    this.server.addTool(getCodeDefinitions(ctx));
    this.server.addTool(executeCommand(ctx));
  }

  start() {
    this.server.start({ transportType: 'stdio' });
  }
}
