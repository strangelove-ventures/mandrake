import { NextRequest } from 'next/server';
import { listConfigSets, getConfigSet } from './list';
import { createConfigSet } from './create';
import { deleteConfigSet } from './delete';
import { getServerConfig, addServerConfig, updateServerConfig, removeServerConfig } from './server';
import { getActiveConfigSet, setActiveConfigSet } from './active';
import { getServerStatus } from './status';
import { listServerMethods, executeServerMethod } from './methods';

/**
 * Creates handlers for tool config set routes (both system and workspace-level)
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createToolsConfigRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - List tool config sets or get a specific config set
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string, setId?: string } } = {}
    ) {
      // If setId is provided, get a specific config set
      if (params?.setId) {
        return getConfigSet(req, { params, workspaceScoped });
      }
      // Otherwise, list all config sets
      return listConfigSets(req, { params, workspaceScoped });
    },
    
    /**
     * POST - Create a new config set
     */
    async POST(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      return createConfigSet(req, { params, workspaceScoped });
    },
    
    /**
     * DELETE - Remove a config set
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id?: string, setId: string } }
    ) {
      return deleteConfigSet(req, { params, workspaceScoped });
    }
  };
}

/**
 * Creates handlers for server config routes within a config set
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createServerConfigRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - Get a server config
     */
    async GET(
      req: NextRequest,
      { params }: { params: { id?: string, setId: string, serverId: string } }
    ) {
      return getServerConfig(req, { params, workspaceScoped });
    },
    
    /**
     * POST - Add a server config
     */
    async POST(
      req: NextRequest,
      { params }: { params: { id?: string, setId: string } }
    ) {
      return addServerConfig(req, { params, workspaceScoped });
    },
    
    /**
     * PUT - Update a server config
     */
    async PUT(
      req: NextRequest,
      { params }: { params: { id?: string, setId: string, serverId: string } }
    ) {
      return updateServerConfig(req, { params, workspaceScoped });
    },
    
    /**
     * DELETE - Remove a server config
     */
    async DELETE(
      req: NextRequest,
      { params }: { params: { id?: string, setId: string, serverId: string } }
    ) {
      return removeServerConfig(req, { params, workspaceScoped });
    }
  };
}

/**
 * Creates handlers for active config set routes
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createActiveConfigSetRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - Get the active config set
     */
    async GET(
      req: NextRequest,
      { params }: { params?: { id?: string } } = {}
    ) {
      if (!params) { params = {}; }
      return getActiveConfigSet(req, { params, workspaceScoped });
    },
    
    /**
     * PUT - Set the active config set
    */
   async PUT(
     req: NextRequest,
     { params }: { params?: { id?: string } } = {}
    ) {
      if (!params) { params = {}; }
      return setActiveConfigSet(req, { params, workspaceScoped });
    }
  };
}

/**
 * Creates handlers for server status routes
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createServerStatusRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - Get the server status
     */
    async GET(
      req: NextRequest,
      { params }: { params: { id?: string, serverName: string } }
    ) {
      return getServerStatus(req, { params, workspaceScoped });
    }
  };
}

/**
 * Creates handlers for server methods routes
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createServerMethodsRoutes(workspaceScoped = false) {
  return {
    /**
     * GET - List server methods
     */
    async GET(
      req: NextRequest,
      { params }: { params: { id?: string, serverName: string } }
    ) {
      return listServerMethods(req, { params, workspaceScoped });
    }
  };
}

/**
 * Creates handlers for executing server methods
 * @param workspaceScoped Whether these routes are scoped to a workspace
 */
export function createExecuteMethodRoutes(workspaceScoped = false) {
  return {
    /**
     * POST - Execute a server method
     */
    async POST(
      req: NextRequest,
      { params }: { params: { id?: string, serverName: string, methodName: string } }
    ) {
      return executeServerMethod(req, { params, workspaceScoped });
    }
  };
}
