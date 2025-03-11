import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { MCPServer } from '@mandrake/utils/src/types/mcp/server';
import type { ServerConfig, ServerState } from '@mandrake/mcp/src/types';
import type { WorkspaceManager } from '@mandrake/workspace/src/managers/workspace';
import { createLogger } from '@mandrake/utils';

/**
 * In-memory implementation of MCPServer that directly calls WorkspaceManager methods
 * without spawning external processes or using transports
 */
export class WorkspaceInMemoryServer implements MCPServer {
  private state: ServerState;
  private isRunning: boolean = false;
  private tools: Tool[] = [];
  private logger = createLogger('workspace-mcp-server');

  constructor(
    private id: string,
    private config: ServerConfig,
    private workspaceManager: WorkspaceManager
  ) {
    this.state = {
      retryCount: 0,
      logs: []
    };
    
    // Set up tools based on available workspace manager methods
    this.setupTools();
  }

  private setupTools() {
    // Define tools that map to workspace manager methods
    this.tools = [
      // File operations
      {
        name: 'readFile',
        description: 'Read a file from the workspace',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path relative to workspace root' }
          },
          required: ['path']
        },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'writeFile',
        description: 'Write content to a file in the workspace',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path relative to workspace root' },
            content: { type: 'string', description: 'Content to write to the file' }
          },
          required: ['path', 'content']
        },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'listFiles',
        description: 'List files in a directory in the workspace',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path relative to workspace root' }
          },
          required: ['path']
        },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'searchFiles',
        description: 'Search for files by pattern in the workspace',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Glob pattern to search for' },
            path: { type: 'string', description: 'Base directory to start search from' }
          },
          required: ['pattern']
        },
        inputSchema: { type: 'object', properties: {} }
      },
      // Configuration operations
      {
        name: 'getModelsConfig',
        description: 'Get the models configuration for the workspace',
        parameters: {
          type: 'object',
          properties: {}
        },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'updateModelsConfig',
        description: 'Update the models configuration for the workspace',
        parameters: {
          type: 'object',
          properties: {
            config: { type: 'object', description: 'The new models configuration' }
          },
          required: ['config']
        },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'getPromptConfig',
        description: 'Get the prompt configuration for the workspace',
        parameters: {
          type: 'object',
          properties: {}
        },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'updatePromptConfig',
        description: 'Update the prompt configuration for the workspace',
        parameters: {
          type: 'object',
          properties: {
            config: { type: 'object', description: 'The new prompt configuration' }
          },
          required: ['config']
        },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'getToolsConfig',
        description: 'Get the tools configuration for the workspace',
        parameters: {
          type: 'object',
          properties: {}
        },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'updateToolsConfig',
        description: 'Update the tools configuration for the workspace',
        parameters: {
          type: 'object',
          properties: {
            config: { type: 'object', description: 'The new tools configuration' }
          },
          required: ['config']
        },
        inputSchema: { type: 'object', properties: {} }
      },
      // Session operations
      {
        name: 'listSessions',
        description: 'List all sessions in the workspace',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of sessions to return' },
            offset: { type: 'number', description: 'Number of sessions to skip' }
          }
        },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'getSession',
        description: 'Get a specific session by ID',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Session ID' }
          },
          required: ['id']
        },
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'searchSessions',
        description: 'Search for sessions by content',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum number of sessions to return' }
          },
          required: ['query']
        },
        inputSchema: { type: 'object', properties: {} }
      }
    ];
  }

  getId(): string {
    return this.id;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    try {
      this.logger.info('Starting in-memory workspace server', { id: this.id });
      // No need to start external processes, just mark as running
      this.isRunning = true;
      this.state.error = undefined;
      this.state.retryCount = 0;
      this.logger.info('In-memory workspace server started successfully');
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to start in-memory workspace server', { error: this.state.error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping in-memory workspace server');
    this.isRunning = false;
    this.logger.info('In-memory workspace server stopped successfully');
  }

  async listTools(): Promise<Tool[]> {
    if (this.config.disabled) {
      return [];
    }
    
    if (!this.isRunning) {
      throw new Error('Server not running');
    }
    
    return this.tools;
  }

  async invokeTool(name: string, params: any): Promise<any> {
    if (this.config.disabled) {
      throw new Error('Server is disabled');
    }
    
    if (!this.isRunning) {
      throw new Error('Server not running');
    }
    
    try {
      this.logger.debug('Invoking tool', { name, params });
      
      // Directly invoke workspace manager methods based on tool name
      switch (name) {
        case 'readFile':
          return { 
            isError: false,
            content: [{ type: 'text', text: await this.workspaceManager.files.get(params.path) }]
          };
          
        case 'writeFile':
          await this.workspaceManager.files.create(params.path, params.content);
          return { 
            isError: false,
            content: [{ type: 'text', text: 'File written successfully' }]
          };
          
        case 'listFiles':
          const files = await this.workspaceManager.files.list(params.path);
          return {
            isError: false,
            content: [{ type: 'text', text: JSON.stringify(files) }]
          };
          
        case 'getModelsConfig':
          const modelsConfig = await this.workspaceManager.models.listModels();
          return {
            isError: false,
            content: [{ type: 'text', text: JSON.stringify(modelsConfig) }]
          };
          
        case 'updateModelsConfig':
          await this.workspaceManager.models.updateModel(params.id, params.config);
          return {
            isError: false,
            content: [{ type: 'text', text: 'Models configuration updated successfully' }]
          };
          
        case 'getPromptConfig':
          const promptConfig = await this.workspaceManager.prompt.getConfig();
          return {
            isError: false,
            content: [{ type: 'text', text: JSON.stringify(promptConfig) }]
          };
          
        case 'updatePromptConfig':
          await this.workspaceManager.prompt.updateConfig(params.config);
          return {
            isError: false,
            content: [{ type: 'text', text: 'Prompt configuration updated successfully' }]
          };
          
        case 'getToolsConfig':
          const toolsConfig = await this.workspaceManager.tools.getConfigSet(await this.workspaceManager.tools.getActive());
          return {
            isError: false,
            content: [{ type: 'text', text: JSON.stringify(toolsConfig) }]
          };
          
        case 'updateToolsConfig':
          await this.workspaceManager.tools.updateServerConfig(params.setId, params.serverId, params.config);
          return {
            isError: false,
            content: [{ type: 'text', text: 'Tools configuration updated successfully' }]
          };
          
        case 'listSessions':
          const sessions = await this.workspaceManager.sessions.listSessions({
            limit: params.limit,
            offset: params.offset
          });
          return {
            isError: false,
            content: [{ type: 'text', text: JSON.stringify(sessions) }]
          };
          
        case 'getSession':
          const session = await this.workspaceManager.sessions.getSession(params.id);
          return {
            isError: false,
            content: [{ type: 'text', text: JSON.stringify(session) }]
          };
          
        case 'searchSessions':
          // This would need a custom implementation in the session manager
          // For now, we'll just return all sessions and let the caller filter
          const allSessions = await this.workspaceManager.sessions.listSessions();
          const filteredSessions = allSessions.filter(s => 
            s.title?.includes(params.query) || 
            s.description?.includes(params.query)
          ).slice(0, params.limit || 10);
          
          return {
            isError: false,
            content: [{ type: 'text', text: JSON.stringify(filteredSessions) }]
          };
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.state.logs.push(errorMessage);
      this.logger.error('Error invoking tool', { name, error: errorMessage });
      return {
        isError: true,
        content: [{ type: 'text', text: errorMessage }]
      };
    }
  }

  getState(): ServerState {
    return { ...this.state };
  }
}