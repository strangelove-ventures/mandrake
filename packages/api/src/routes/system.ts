import { Hono } from 'hono';
import { toolsConfigRoutes, toolsOperationRoutes, serverRoutes, allToolRoutes } from './tools';
import { modelsRoutes, providersRoutes } from './models';
import { promptRoutes } from './prompt';
import { mandrakeConfigRoutes } from './config';
import { sessionDatabaseRoutes, systemSessionDatabaseRoutes } from './sessions';
import { systemSessionStreamingRoutes } from './streaming';
import { dynamicContextRoutes } from './dynamic';
import { filesRoutes } from './files';
import type { ServiceRegistry } from '../services/registry';
import { MandrakeManagerAdapter, MCPManagerAdapter, SessionCoordinatorAdapter, WorkspaceManagerAdapter } from '../services/registry/adapters';
import { MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import type { Managers, ManagerAccessors, WebSocketManager } from '../types';

/**
 * Create a properly structured Managers object from registry services
 * @param registry The service registry
 * @param mandrakeManager The mandrake manager instance (required)
 * @param mcpManager The MCP manager instance (required for system routes)
 * @returns A Managers object that conforms to the expected interface
 */
function createManagersObject(
  registry: ServiceRegistry,
  mandrakeManager: MandrakeManager,
  mcpManager: MCPManager
): Managers {
  // Create system session coordinators map
  // If we have a system coordinator adapter, add its coordinator to the map
  const systemSessionCoordinators = new Map<string, SessionCoordinator>();
  const systemCoordinatorAdapter = registry.getService<SessionCoordinatorAdapter>('session-coordinator');
  if (systemCoordinatorAdapter) {
    const coordinator = systemCoordinatorAdapter.getCoordinator();
    if (coordinator) {
      systemSessionCoordinators.set('system', coordinator);
    }
  }
  
  // Initialize workspace tracking maps
  const workspaceManagers = new Map();
  const mcpManagers = new Map();
  const sessionCoordinators = new Map<string, Map<string, SessionCoordinator>>();
  
  // Try to get initial workspace list
  try {
    const workspaces = mandrakeManager.listWorkspaces();
    
    if (Array.isArray(workspaces)) {
      // Pre-populate workspace managers for known workspaces
      for (const workspace of workspaces) {
        const workspaceId = workspace.id;
        
        // Add workspace manager to the map if available through registry
        const workspaceManagerAdapter = registry.getWorkspaceService<WorkspaceManagerAdapter>(
          workspaceId, 
          'workspace-manager'
        );
        
        if (workspaceManagerAdapter) {
          workspaceManagers.set(workspaceId, workspaceManagerAdapter.getManager());
        }
        
        // Add MCP manager to the map if available through registry
        const mcpManagerAdapter = registry.getWorkspaceService<MCPManagerAdapter>(
          workspaceId,
          'mcp-manager'
        );
        
        if (mcpManagerAdapter) {
          mcpManagers.set(workspaceId, mcpManagerAdapter.getManager());
        }
        
        // Initialize empty session coordinators maps for each workspace
        sessionCoordinators.set(workspaceId, new Map<string, SessionCoordinator>());
      }
    }
  } catch (error) {
    console.warn('Error pre-populating workspace managers:', error);
    // Continue even if this fails, as lazy initialization will handle it
  }
  
  // Return properly structured Managers object
  return {
    mandrakeManager,
    systemMcpManager: mcpManager,
    systemSessionCoordinators,
    workspaceManagers,
    mcpManagers,
    sessionCoordinators
  };
}

/**
 * Create a properly implemented ManagerAccessors object that uses the registry
 * @param registry The service registry
 * @returns An accessors object with functions to access services through the registry
 */
function createAccessorsObject(registry: ServiceRegistry): ManagerAccessors {
  // Create a persistent map to track session coordinators across function calls
  // This is shared across all accessor methods through closure
  const coordinatorMaps = new Map<string, Map<string, SessionCoordinator>>();
  
  return {
    // Get workspace manager from registry by ID
    getWorkspaceManager: (workspaceId: string) => {
      const adapter = registry.getWorkspaceService<WorkspaceManagerAdapter>(
        workspaceId, 
        'workspace-manager'
      );
      return adapter ? adapter.getManager() : undefined;
    },
    
    // Get MCP manager from registry by workspace ID
    getMcpManager: (workspaceId: string) => {
      const adapter = registry.getWorkspaceService<MCPManagerAdapter>(
        workspaceId, 
        'mcp-manager'
      );
      return adapter ? adapter.getManager() : undefined;
    },
    
    // Get session coordinator for a specific workspace and session
    getSessionCoordinator: (workspaceId: string, sessionId: string) => {
      // Check if we already have a coordinator in our maps
      const coordMap = coordinatorMaps.get(workspaceId);
      if (coordMap && coordMap.has(sessionId)) {
        return coordMap.get(sessionId);
      }
      
      // Try to get the coordinator adapter from the registry
      const coordinatorAdapter = registry.getWorkspaceService<SessionCoordinatorAdapter>(
        workspaceId,
        'session-coordinator'
      );
      
      if (coordinatorAdapter) {
        // If found, get its coordinator instance
        const coordinator = coordinatorAdapter.getCoordinator();
        
        // Store it in our map for future reference
        if (coordinator) {
          if (!coordMap) {
            coordinatorMaps.set(workspaceId, new Map());
          }
          (coordinatorMaps.get(workspaceId) as any).set(sessionId, coordinator);
          return coordinator;
        }
      }
      
      // If we couldn't get or create a coordinator, return undefined
      return undefined;
    },
    
    // Get the coordinators map for a workspace - create if missing
    getSessionCoordinatorMap: (workspaceId: string) => {
      // If we don't have a map for this workspace, create one
      if (!coordinatorMaps.has(workspaceId)) {
        coordinatorMaps.set(workspaceId, new Map<string, SessionCoordinator>());
      }
      
      return coordinatorMaps.get(workspaceId);
    },
    
    // Create a session coordinator for a workspace/session combination
    createSessionCoordinator: (workspaceId: string, sessionId: string, coordinator: SessionCoordinator) => {
      // Get or create the map for this workspace
      let coordMap = coordinatorMaps.get(workspaceId);
      
      // If the map doesn't exist, create it and ensure we get a reference to the new map
      if (!coordMap) {
        coordinatorMaps.set(workspaceId, new Map<string, SessionCoordinator>());
        coordMap = coordinatorMaps.get(workspaceId);
        
        // If creating the map failed for some reason, throw an error
        if (!coordMap) {
          throw new Error(`Failed to create coordinator map for workspace ${workspaceId}`);
        }
      }
      
      // Add the coordinator to the map
      coordMap.set(sessionId, coordinator);
      
      // Return true to indicate success
      return true;
    },
    
    // Remove a session coordinator
    removeSessionCoordinator: (workspaceId: string, sessionId: string) => {
      // Get the map for this workspace
      const coordMap = coordinatorMaps.get(workspaceId);
      
      // If we have a map and it contains the session, delete it
      if (coordMap && coordMap.has(sessionId)) {
        coordMap.delete(sessionId);
        return true;
      }
      
      return false;
    }
  };
}

/**
 * Create system-level routes for the Mandrake API
 * @param registry Service registry for accessing all managed services
 */
export function systemRoutes(registry: ServiceRegistry, wsManager?: WebSocketManager) {
  const app = new Hono();
  
  
  // Get the System MCP Manager from registry
  const getMcpManager = () => {
    const adapter = registry.getService<MCPManagerAdapter>('mcp-manager');
    if (!adapter) {
      throw new Error('MCPManager service not found in registry');
    }
    return adapter.getManager();
  };
  
  // System info endpoint
  app.get('/', async (c) => {
    try {
      // Get MandrakeManager
      const mandrakeManagerAdapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
      if (!mandrakeManagerAdapter) {
        throw new Error('MandrakeManager service not available');
      }
      const mandrakeManager = mandrakeManagerAdapter.getManager();
      
      // Get service status information
      const serviceStatusMap = await registry.getAllServiceStatuses();
      const serviceStatuses = Array.from(serviceStatusMap.entries())
        .filter(([key]) => !key.includes(':')) // Only include system-level services
        .map(([key, status]) => ({
          type: key,
          healthy: status.isHealthy,
          statusCode: status.statusCode,
          message: status.message
        }));
      
      // Handle workspaces count safely
      let workspacesCount = 0;
      try {
        const workspaces = await mandrakeManager.listWorkspaces();
        workspacesCount = Array.isArray(workspaces) ? workspaces.length : 0;
      } catch (err) {
        console.warn('Error counting workspaces:', err);
      }
      
      return c.json({
        version: process.env.npm_package_version || '0.1.0',
        path: mandrakeManager.paths?.root || '',
        workspaces: workspacesCount,
        services: serviceStatuses
      });
    } catch (error) {
      console.error('Error in system info endpoint:', error);
      return c.json({
        version: process.env.npm_package_version || '0.1.0',
        services: [],
        error: 'Failed to get complete system information'
      });
    }
  });
  
  // Mount all routes using the registry service pattern
  
  // Config routes
  try {
    app.all('/config/*', async (c) => {
      try {
        const mandrakeManager = await registry.getMandrakeManager();
        const configRouter = mandrakeConfigRoutes(mandrakeManager.config);
        
        // Create a new request with the path modified to strip the /config prefix
        const url = new URL(c.req.url);
        const pathParts = url.pathname.split('/');
        const configIndex = pathParts.findIndex(part => part === 'config');
        
        if (configIndex !== -1) {
          const newPathParts = pathParts.slice(configIndex + 1);
          url.pathname = '/' + newPathParts.join('/');
          const newRequest = new Request(url.toString(), c.req.raw);
          return configRouter.fetch(newRequest, c.env);
        }
        
        return c.json({ error: 'Invalid config path' }, 404);
      } catch (error) {
        console.error('Error in config routes:', error);
        return c.json({ error: 'Config service unavailable' }, 503);
      }
    });
  } catch (error) {
    console.error('Error setting up config routes:', error);
    app.get('/config', (c) => {
      return c.json({ error: 'Config service unavailable' }, 503);
    });
    app.get('/config/*', (c) => {
      return c.json({ error: 'Config service unavailable' }, 503);
    });
  }
  
  // Tool routes
  try {
    app.all('/tools/*', async (c) => {
      try {
        const mandrakeManager = await registry.getMandrakeManager();
        const mcpManager = await getMcpManager();
        const toolsRouter = allToolRoutes(mandrakeManager.tools, mcpManager);
        
        // Create a new request with the path modified to strip the /tools prefix
        const url = new URL(c.req.url);
        const pathParts = url.pathname.split('/');
        const toolsIndex = pathParts.findIndex(part => part === 'tools');
        
        if (toolsIndex !== -1) {
          const newPathParts = pathParts.slice(toolsIndex + 1);
          url.pathname = '/' + newPathParts.join('/');
          const newRequest = new Request(url.toString(), c.req.raw);
          return toolsRouter.fetch(newRequest, c.env);
        }
        
        return c.json({ error: 'Invalid tools path' }, 404);
      } catch (error) {
        console.error('Error handling tools route:', error);
        return c.json({ error: 'Tools service unavailable' }, 503);
      }
    });
  } catch (error) {
    console.error('Error setting up tools routes:', error);
    app.get('/tools', (c) => {
      return c.json({ error: 'Tools service unavailable' }, 503);
    });
    app.get('/tools/*', (c) => {
      return c.json({ error: 'Tools service unavailable' }, 503);
    });
  }
  
  // Model routes
  try {
    // Get MandrakeManager for models
    const mandrakeManagerAdapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!mandrakeManagerAdapter) {
      throw new Error('MandrakeManager service not available');
    }
    const mandrakeManager = mandrakeManagerAdapter.getManager();
    
    // Create the models router with the appropriate manager
    const modelsRouter = modelsRoutes(mandrakeManager.models);
    
    // Handle all models routes
    app.all('/models/*', async (c) => {
      try {
        // Create a new request with the path modified to strip the /models prefix
        const url = new URL(c.req.url);
        const pathParts = url.pathname.split('/');
        const modelsIndex = pathParts.findIndex(part => part === 'models');
        
        if (modelsIndex !== -1) {
          const newPathParts = pathParts.slice(modelsIndex + 1);
          url.pathname = '/' + newPathParts.join('/');
          const newRequest = new Request(url.toString(), c.req.raw);
          return modelsRouter.fetch(newRequest, c.env);
        }
        
        return c.json({ error: 'Invalid models path' }, 404);
      } catch (error) {
        console.error('Error handling models route:', error);
        return c.json({ error: 'Models service unavailable' }, 503);
      }
    });
  } catch (error) {
    console.error('Error setting up models routes:', error);
    app.get('/models', (c) => {
      return c.json({ error: 'Models service unavailable' }, 503);
    });
    app.get('/models/*', (c) => {
      return c.json({ error: 'Models service unavailable' }, 503);
    });
  }
  
  // Provider routes
  try {
    // Get MandrakeManager
    const mandrakeManagerAdapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!mandrakeManagerAdapter) {
      throw new Error('MandrakeManager service not available');
    }
    const mandrakeManager = mandrakeManagerAdapter.getManager();
    
    const providersRouter = providersRoutes(mandrakeManager.models);
    app.route('/providers', providersRouter);
  } catch (error) {
    console.error('Error setting up providers routes:', error);
    app.get('/providers', (c) => {
      return c.json({ error: 'Providers service unavailable' }, 503);
    });
    app.get('/providers/*', (c) => {
      return c.json({ error: 'Providers service unavailable' }, 503);
    });
  }
  
  // Prompt routes
  try {
    // Get MandrakeManager
    const mandrakeManagerAdapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!mandrakeManagerAdapter) {
      throw new Error('MandrakeManager service not available');
    }
    const mandrakeManager = mandrakeManagerAdapter.getManager();
    
    const promptRouter = promptRoutes(mandrakeManager.prompt);
    app.route('/prompt', promptRouter);
  } catch (error) {
    console.error('Error setting up prompt routes:', error);
    app.get('/prompt', (c) => {
      return c.json({ error: 'Prompt service unavailable' }, 503);
    });
    app.get('/prompt/*', (c) => {
      return c.json({ error: 'Prompt service unavailable' }, 503);
    });
  }
  
  // Session database routes - accessing SessionManager through MandrakeManager
  try {
    // Get MandrakeManager
    const mandrakeManagerAdapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!mandrakeManagerAdapter) {
      throw new Error('MandrakeManager service not available');
    }
    const mandrakeManager = mandrakeManagerAdapter.getManager();
    
    // Get MCP Manager
    const mcpManagerAdapter = registry.getService<MCPManagerAdapter>('mcp-manager');
    if (!mcpManagerAdapter) {
      throw new Error('MCPManager service not available');
    }
    const mcpManager = mcpManagerAdapter.getManager();
    
    // Create a proper Managers object with registry-backed services
    const managers = createManagersObject(registry, mandrakeManager, mcpManager);
    
    // Create properly implemented accessors object
    const accessors = createAccessorsObject(registry);
    
    // Pass the proper managers and accessors objects
    const sessionRouter = systemSessionDatabaseRoutes(managers, accessors);
    app.route('/sessions', sessionRouter);
  } catch (error) {
    console.error('Error setting up session routes:', error);
    app.get('/sessions', (c) => {
      return c.json({ error: 'Session service unavailable' }, 503);
    });
    app.get('/sessions/*', (c) => {
      return c.json({ error: 'Session service unavailable' }, 503);
    });
  }
  
  // Session streaming routes - access SessionCoordinator via factory function
  try {
    // Get MandrakeManager
    const mandrakeManagerAdapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!mandrakeManagerAdapter) {
      throw new Error('MandrakeManager service not available');
    }
    const mandrakeManager = mandrakeManagerAdapter.getManager();
    
    // Get MCP Manager
    const mcpManagerAdapter = registry.getService<MCPManagerAdapter>('mcp-manager');
    if (!mcpManagerAdapter) {
      throw new Error('MCPManager service not available');
    }
    const mcpManager = mcpManagerAdapter.getManager();
    
    // Use the same managers and accessors creation functions for consistency
    const managers = createManagersObject(registry, mandrakeManager, mcpManager);
    const accessors = createAccessorsObject(registry);
    
    // Set up the streaming routes with proper managers object and WebSocket manager
    const streamingRouter = systemSessionStreamingRoutes(managers, accessors, wsManager);
    app.route('/streaming', streamingRouter);
  } catch (error) {
    console.error('Error setting up streaming routes:', error);
    app.get('/streaming', (c) => {
      return c.json({ error: 'Streaming service unavailable' }, 503);
    });
    app.get('/streaming/*', (c) => {
      return c.json({ error: 'Streaming service unavailable' }, 503);
    });
  }
  // Dynamic context routes
  try {
    // Get MandrakeManager
    const mandrakeManagerAdapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!mandrakeManagerAdapter) {
      throw new Error('MandrakeManager service not available');
    }
    const mandrakeManager = mandrakeManagerAdapter.getManager();
    
    if ((mandrakeManager as any).dynamic) {
      const dynamicRouter = dynamicContextRoutes((mandrakeManager as any).dynamic);
      app.route('/dynamic', dynamicRouter);
    } else {
      app.get('/dynamic', (c) => {
        return c.json({ error: 'Dynamic context not available' }, 404);
      });
      app.get('/dynamic/*', (c) => {
        return c.json({ error: 'Dynamic context not available' }, 404);
      });
    }
  } catch (error) {
    console.error('Error setting up dynamic routes:', error);
    app.get('/dynamic', (c) => {
      return c.json({ error: 'Dynamic context service unavailable' }, 503);
    });
    app.get('/dynamic/*', (c) => {
      return c.json({ error: 'Dynamic context service unavailable' }, 503);
    });
  }
  
  // Files routes
  try {
    // Get MandrakeManager
    const mandrakeManagerAdapter = registry.getService<MandrakeManagerAdapter>('mandrake-manager');
    if (!mandrakeManagerAdapter) {
      throw new Error('MandrakeManager service not available');
    }
    const mandrakeManager = mandrakeManagerAdapter.getManager();
    
    if ((mandrakeManager as any).files) {
      const filesRouter = filesRoutes((mandrakeManager as any).files);
      app.route('/files', filesRouter);
    } else {
      app.get('/files', (c) => {
        return c.json({ error: 'Files manager not available' }, 404);
      });
      app.get('/files/*', (c) => {
        return c.json({ error: 'Files manager not available' }, 404);
      });
    }
  } catch (error) {
    console.error('Error setting up files routes:', error);
    app.get('/files', (c) => {
      return c.json({ error: 'Files service unavailable' }, 503);
    });
    app.get('/files/*', (c) => {
      return c.json({ error: 'Files service unavailable' }, 503);
    });
  }
  
  // Service status endpoint
  app.get('/services/status', async (c) => {
    try {
      // Get all system-level services (without workspace prefix)
      const serviceStatuses = await registry.getAllServiceStatuses();
      const systemServices = Array.from(serviceStatuses.entries())
        .filter(([key]) => !key.includes(':'))
        .reduce((acc, [key, status]) => {
          acc[key] = status;
          return acc;
        }, {} as Record<string, any>);
        
      return c.json(systemServices);
    } catch (error) {
      console.error('Error getting service status:', error);
      return c.json({ error: 'Failed to get service status' }, 500);
    }
  });
  
  return app;
}