import { NextRequest } from 'next/server';
import { ToolsHandler } from '../handlers/ToolsHandler';
import { handleApiError } from '../middleware/errorHandling';
import { createApiResponse, createNoContentResponse } from '../utils/response';
import { getWorkspaceManager } from '../utils/workspace';
import { validateParams, validateQuery } from '../middleware/validation';
import { z } from 'zod';

// Parameter schemas
const configSetIdSchema = z.object({
  setId: z.string().min(1, "Config set ID is required")
});

const serverIdSchema = z.object({
  serverId: z.string().min(1, "Server ID is required")
});

const activeQuerySchema = z.object({
  setId: z.string().min(1, "Config set ID is required")
});

/**
 * Creates route handlers for tools endpoints
 * @param isWorkspaceScope Whether these routes are for workspace-specific tools
 * @returns Route handler methods
 */
export function createToolsRoutes(isWorkspaceScope: boolean = false) {
  return {
    // GET handler for listing config sets, getting a specific config set,
    // or getting the active set
    async GET(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: ToolsHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new ToolsHandler(workspaceId, workspaceManager);
        } else {
          handler = new ToolsHandler();
        }
        
        // Check for active query parameter
        try {
          const url = new URL(req.url);
          if (url.searchParams.has('active')) {
            const activeId = await handler.getActive();
            return createApiResponse({ active: activeId });
          }
        } catch (error) {
          // Ignore URL parsing errors
        }
        
        // Handle server config request
        if (params?.setId && params?.serverId) {
          const { setId } = validateParams(params, configSetIdSchema);
          const { serverId } = validateParams(params, serverIdSchema);
          const serverConfig = await handler.getServerConfig(setId, serverId);
          return createApiResponse(serverConfig);
        }
        
        // Handle specific config set request
        if (params?.setId) {
          const { setId } = validateParams(params, configSetIdSchema);
          const configSet = await handler.getConfigSet(setId);
          return createApiResponse(configSet);
        }
        
        // List all config sets
        const configSets = await handler.listConfigSets();
        return createApiResponse(configSets);
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // POST handler for creating a new config set, adding a server config,
    // or setting the active config
    async POST(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: ToolsHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new ToolsHandler(workspaceId, workspaceManager);
        } else {
          handler = new ToolsHandler();
        }
        
        // Handle setting active config set
        try {
          const url = new URL(req.url);
          if (url.pathname.endsWith('/active')) {
            const body = await req.json();
            await handler.setActive(body.setId);
            return createApiResponse({ success: true });
          }
        } catch (error) {
          // Ignore URL parsing errors
        }
        
        // Handle adding server config to a config set
        if (params?.setId && params?.serverId) {
          const { setId } = validateParams(params, configSetIdSchema);
          const { serverId } = validateParams(params, serverIdSchema);
          await handler.addServerConfig(setId, serverId, req);
          
          const serverConfig = await handler.getServerConfig(setId, serverId);
          return createApiResponse(serverConfig, 201);
        }
        
        // Handle adding a new config set
        if (params?.setId) {
          const { setId } = validateParams(params, configSetIdSchema);
          await handler.addConfigSet(setId, req);
          
          const configSet = await handler.getConfigSet(setId);
          return createApiResponse(configSet, 201);
        }
        
        return handleApiError(new Error('Missing setId parameter'));
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // PUT handler for updating a config set or server config
    async PUT(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: ToolsHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new ToolsHandler(workspaceId, workspaceManager);
        } else {
          handler = new ToolsHandler();
        }
        
        // Handle updating server config
        if (params?.setId && params?.serverId) {
          const { setId } = validateParams(params, configSetIdSchema);
          const { serverId } = validateParams(params, serverIdSchema);
          await handler.updateServerConfig(setId, serverId, req);
          
          const serverConfig = await handler.getServerConfig(setId, serverId);
          return createApiResponse(serverConfig);
        }
        
        // Handle updating config set
        if (params?.setId) {
          const { setId } = validateParams(params, configSetIdSchema);
          await handler.updateConfigSet(setId, req);
          
          const configSet = await handler.getConfigSet(setId);
          return createApiResponse(configSet);
        }
        
        return handleApiError(new Error('Missing setId parameter'));
      } catch (error) {
        return handleApiError(error);
      }
    },
    
    // DELETE handler for removing a config set or server config
    async DELETE(
      req: NextRequest,
      { params }: { params?: Record<string, string | string[]> } = {}
    ) {
      try {
        let workspaceId: string | undefined;
        let handler: ToolsHandler;
        
        // Setup handler based on scope
        if (isWorkspaceScope && params?.id) {
          workspaceId = params.id as string;
          const workspaceManager = await getWorkspaceManager(workspaceId);
          handler = new ToolsHandler(workspaceId, workspaceManager);
        } else {
          handler = new ToolsHandler();
        }
        
        // Handle removing server config
        if (params?.setId && params?.serverId) {
          const { setId } = validateParams(params, configSetIdSchema);
          const { serverId } = validateParams(params, serverIdSchema);
          await handler.removeServerConfig(setId, serverId);
          return createNoContentResponse();
        }
        
        // Handle removing config set
        if (params?.setId) {
          const { setId } = validateParams(params, configSetIdSchema);
          await handler.removeConfigSet(setId);
          return createNoContentResponse();
        }
        
        return handleApiError(new Error('Missing setId parameter'));
      } catch (error) {
        return handleApiError(error);
      }
    }
  };
}