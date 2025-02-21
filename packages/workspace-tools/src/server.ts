import { MCPServer, MCPConfig } from 'fastmcp';
import { WorkspaceManager } from '@mandrake/workspace';
import { WorkspaceToolContext, ToolResponse } from './types';
import {
  dynamicContextTool,
  filesManagementTool,
  modelsManagementTool,
  promptManagementTool
} from './tools';

/**
 * MCP Server for workspace management tools
 */
export class WorkspaceToolServer extends MCPServer {
  private context: WorkspaceToolContext;

  constructor(
    workspace: WorkspaceManager,
    config?: Partial<MCPConfig>
  ) {
    // Default config values optimized for file/config operations
    const defaultConfig: MCPConfig = {
      name: 'workspace-tools',
      description: 'Tools for managing Mandrake workspace configuration',
      version: '1.0.0',
      timeout: 30000, // 30s timeout for file operations
      ...config
    };

    super(defaultConfig);

    // Initialize context
    this.context = {
      workspace,
      workingDir: workspace.rootDir,
      allowedDirs: [workspace.rootDir]
    };

    // Register all tools
    this.registerTools();
  }

  private registerTools(): void {
    // Register core tools
    this.registerTool(dynamicContextTool);
    this.registerTool(filesManagementTool);
    this.registerTool(modelsManagementTool);
    this.registerTool(promptManagementTool);
  }

  protected async executeTool(
    name: string,
    args: unknown
  ): Promise<ToolResponse> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    return tool.execute(args, this.context);
  }

  /**
   * Update the working directory for tools
   * Useful when workspace root changes
   */
  public setWorkingDir(dir: string): void {
    this.context.workingDir = dir;
    this.context.allowedDirs = [dir];
  }
}