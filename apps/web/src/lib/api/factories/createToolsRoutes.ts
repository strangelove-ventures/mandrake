import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, ErrorCode } from '../middleware/errorHandling';
import { validateBody } from '../middleware/validation';
import { createApiResponse, createNoContentResponse } from '../utils/response';
import { getMCPManager, getMandrakeManager, getWorkspaceManagerById } from '../utils/workspace';

// Validation schemas for tool configuration
const serverConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  autoApprove: z.array(z.string()).optional(),
  disabled: z.boolean().optional()
});

const toolConfigSchema = z.object({
  serverId: z.string(),
  config: serverConfigSchema
});

const toolSetSchema = z.object({
  name: z.string(),
  description: z.string().optional()
});

const toolMethodParamsSchema = z.record(z.any());

/**
 * Creates handlers for tools configuration routes (both system and workspace-level)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createToolsRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - List all tool configurations, a specific tool set, or a specific server in a set
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string, setId?: string, serverId?: string } } = {}
    ) {
      try {
        let toolsManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          toolsManager = workspace.tools;
        } else {
          const mandrakeManager = getMandrakeManager();
          toolsManager = mandrakeManager.tools;
        }
        
        if (params?.serverId && params?.setId) {
          // Get specific server config in a set
          const serverConfig = await toolsManager.getServerConfig(params.setId, params.serverId);
          return createApiResponse({
            id: params.serverId,
            config: serverConfig
          });
        } else if (params?.setId) {
          // Get all server configs in a set
          const toolSet = await toolsManager.getConfigSet(params.setId);
          return createApiResponse({
            id: params.setId,
            servers: Object.entries(toolSet).map(([serverId, config]) => ({
              id: serverId,
              config
            }))
          });
        } else {
          // List all config sets
          const sets = await toolsManager.listConfigSets();
          const activeSet = await toolsManager.getActive();
          
          return createApiResponse({
            sets,
            active: activeSet
          });
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ApiError(
            error.message,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        
        throw new ApiError(
          `Failed to get tool configs: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    },
    
    /**
     * POST - Create a new tool set or add a server config to a set
     */
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string, setId?: string } } = {}
    ) {
      try {
        let toolsManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          toolsManager = workspace.tools;
        } else {
          const mandrakeManager = getMandrakeManager();
          toolsManager = mandrakeManager.tools;
        }
        
        if (params?.setId) {
          // Add server to existing set
          const body = await validateBody(req, toolConfigSchema);
          
          // Add server config to set
          await toolsManager.addServerConfig(
            params.setId,
            body.serverId,
            body.config
          );
          
          return createApiResponse({
            id: body.serverId,
            setId: params.setId,
            config: body.config
          }, 201);
        } else {
          // Create a new set
          const body = await validateBody(req, toolSetSchema);
          
          // Create new empty config set
          await toolsManager.addConfigSet(body.name, {});
          
          return createApiResponse({
            id: body.name,
            servers: []
          }, 201);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          throw new ApiError(
            error.message,
            ErrorCode.CONFLICT,
            409,
            error
          );
        }
        
        throw new ApiError(
          `Failed to create tool config: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    },
    
    /**
     * PUT - Update a server config or set the active tool set
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id?: string, setId: string, serverId?: string } }
    ) {
      try {
        let toolsManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          toolsManager = workspace.tools;
        } else {
          const mandrakeManager = getMandrakeManager();
          toolsManager = mandrakeManager.tools;
        }
        
        if (params.serverId) {
          // Update specific server config
          const body = await validateBody(req, serverConfigSchema);
          
          // Update server config in set
          await toolsManager.updateServerConfig(
            params.setId,
            params.serverId,
            body
          );
          
          // If this server is currently running, update its configuration
          const mcpManager = getMCPManager();
          const server = mcpManager.getServer(params.serverId);
          if (server) {
            await mcpManager.updateServer(params.serverId, body);
          }
          
          return createApiResponse({
            id: params.serverId,
            setId: params.setId,
            config: body
          });
        } else {
          // Set active config set
          await toolsManager.setActive(params.setId);
          
          return createApiResponse({
            active: params.setId
          });
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ApiError(
            error.message,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        
        throw new ApiError(
          `Failed to update tool config: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    },
    
    /**
     * DELETE - Remove a server config or a tool set
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id?: string, setId: string, serverId?: string } }
    ) {
      try {
        let toolsManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          toolsManager = workspace.tools;
        } else {
          const mandrakeManager = getMandrakeManager();
          toolsManager = mandrakeManager.tools;
        }
        
        if (params.serverId) {
          // Stop server if it's running
          const mcpManager = getMCPManager();
          const server = mcpManager.getServer(params.serverId);
          if (server) {
            await mcpManager.stopServer(params.serverId);
          }
          
          // Remove server from set
          await toolsManager.removeServerConfig(params.setId, params.serverId);
        } else {
          // Get list of servers in this set
          const set = await toolsManager.getConfigSet(params.setId);
          
          // Stop all running servers in this set
          const mcpManager = getMCPManager();
          for (const serverId of Object.keys(set)) {
            const server = mcpManager.getServer(serverId);
            if (server) {
              await mcpManager.stopServer(serverId);
            }
          }
          
          // Remove entire set
          await toolsManager.removeConfigSet(params.setId);
        }
        
        return createNoContentResponse();
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new ApiError(
            error.message,
            ErrorCode.RESOURCE_NOT_FOUND,
            404,
            error
          );
        }
        
        throw new ApiError(
          `Failed to delete tool config: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    }
  };
}

/**
 * Creates handlers for active tool set routes
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createActiveToolsRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - Get active tool set and servers
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      try {
        let toolsManager;
        
        if (workspaceScoped) {
          if (!params?.id) {
            throw new ApiError(
              'Workspace ID is required',
              ErrorCode.BAD_REQUEST,
              400
            );
          }
          const workspace = await getWorkspaceManagerById(params.id);
          toolsManager = workspace.tools;
        } else {
          const mandrakeManager = getMandrakeManager();
          toolsManager = mandrakeManager.tools;
        }
        
        // Get active set name
        const activeSetId = await toolsManager.getActive();
        
        // Get the configs in the active set
        const activeSet = await toolsManager.getConfigSet(activeSetId);
        
        // Get MCP manager for current server states
        const mcpManager = getMCPManager();
        
        // Map configs to include current status
        const servers = [];
        for (const [serverId, config] of Object.entries(activeSet)) {
          let status = 'inactive';
          let error = undefined;
          
          const serverInstance = mcpManager.getServer(serverId);
          if (serverInstance) {
            status = 'active';
            const state = serverInstance.getState();
            error = state.error;
          }
          
          servers.push({
            id: serverId,
            config,
            status,
            error
          });
        }
        
        return createApiResponse({
          id: activeSetId,
          servers
        });
      } catch (error) {
        throw new ApiError(
          `Failed to get active tool set: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    }
  };
}

/**
 * Creates handlers for server status routes
 */
export function createServerStatusRoutes() {
  return {
    /**
     * GET - Get status of a server
     */
    async GET(
      req: NextRequest,
      { params }: { params: { serverName: string } }
    ) {
      try {
        const mcpManager = getMCPManager();
        const server = mcpManager.getServer(params.serverName);
        
        if (!server) {
          return createApiResponse({
            id: params.serverName,
            status: 'inactive',
            message: 'Server is not running'
          });
        }
        
        const state = server.getState();
        const config = server.getConfig();
        
        return createApiResponse({
          id: params.serverName,
          status: 'active',
          disabled: config.disabled || false,
          logs: state.logs.slice(-20), // Return last 20 log lines
          error: state.error
        });
      } catch (error) {
        throw new ApiError(
          `Failed to get server status: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.INTERNAL_ERROR,
          500,
          error instanceof Error ? error : undefined
        );
      }
    }
  };
}

/**
 * Creates handlers for server methods routes
 */
export function createServerMethodsRoutes() {
  return {
    /**
     * GET - List available methods for a server
     */
    async GET(
      req: NextRequest,
      { params }: { params: { serverName: string } }
    ) {
      try {
        const mcpManager = getMCPManager();
        const server = mcpManager.getServer(params.serverName);
        
        if (!server) {
          throw new ApiError(
            `Server ${params.serverName} is not running`,
            ErrorCode.SERVICE_UNAVAILABLE,
            503
          );
        }
        
        const tools = await server.listTools();
        
        return createApiResponse({
          server: params.serverName,
          methods: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            schema: tool.schema
          }))
        });
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to list server methods: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    }
  };
}

/**
 * Creates handlers for method execution routes
 */
export function createMethodExecutionRoutes() {
  return {
    /**
     * POST - Execute a tool method
     */
    async POST(
      req: NextRequest,
      { params }: { params: { serverName: string, methodName: string } }
    ) {
      try {
        const mcpManager = getMCPManager();
        const server = mcpManager.getServer(params.serverName);
        
        if (!server) {
          throw new ApiError(
            `Server ${params.serverName} is not running`,
            ErrorCode.SERVICE_UNAVAILABLE,
            503
          );
        }
        
        // Get method args from request body
        const args = await req.json();
        
        // Execute method
        const result = await server.invokeTool(params.methodName, args);
        
        return createApiResponse(result);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw new ApiError(
            `Failed to execute method: ${error instanceof Error ? error.message : String(error)}`,
            ErrorCode.INTERNAL_ERROR,
            500,
            error instanceof Error ? error : undefined
          );
        }
        throw error;
      }
    }
  };
}
