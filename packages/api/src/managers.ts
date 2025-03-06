import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import type { SessionCoordinator } from '@mandrake/session';
import { join } from 'path';
import { readdir } from 'fs/promises';
import type { Managers, ManagerAccessors } from './types';

/**
 * Initialize managers with a specified home directory
 * @param mandrakeHome The home directory for Mandrake
 * @returns Initialized managers and accessor functions
 */
export async function initializeManagers(mandrakeHome?: string): Promise<{ managers: Managers, accessors: ManagerAccessors }> {
  // Set the Mandrake home directory
  const home = mandrakeHome || join(process.env.HOME || '~', '.mandrake');
  
  // Initialize system-level managers
  const mandrakeManager = new MandrakeManager(home);
  await mandrakeManager.init();
  
  // Initialize system MCP manager
  const systemMcpManager = new MCPManager();
  
  // Get system tool configs and initialize MCP servers
  // For now, no need to initialize system tools during testing
  // This will be handled when actual tools are added
  
  const systemSessionCoordinators = new Map<string, SessionCoordinator>();
  
  // Initialize workspace-level maps
  const workspaceManagers = new Map<string, WorkspaceManager>();
  const mcpManagers = new Map<string, MCPManager>();
  const sessionCoordinators = new Map<string, Map<string, SessionCoordinator>>();
  
  // Load existing workspaces
  await loadWorkspaces(mandrakeManager, workspaceManagers, mcpManagers, sessionCoordinators);
  
  const managers: Managers = {
    mandrakeManager,
    systemMcpManager,
    systemSessionCoordinators,
    workspaceManagers,
    mcpManagers,
    sessionCoordinators
  };
  
  const accessors: ManagerAccessors = {
    getWorkspaceManager: (workspaceId: string) => workspaceManagers.get(workspaceId),
    
    getMcpManager: (workspaceId: string) => mcpManagers.get(workspaceId),
    
    getSessionCoordinator: (workspaceId: string, sessionId: string) => {
      const workspaceSessions = sessionCoordinators.get(workspaceId);
      if (!workspaceSessions) return undefined;
      return workspaceSessions.get(sessionId);
    },
    
    getSessionCoordinatorMap: (workspaceId: string) => {
      return sessionCoordinators.get(workspaceId);
    },
    
    createSessionCoordinator: (workspaceId: string, sessionId: string, coordinator: SessionCoordinator) => {
      let workspaceSessions = sessionCoordinators.get(workspaceId);
      if (!workspaceSessions) {
        workspaceSessions = new Map<string, SessionCoordinator>();
        sessionCoordinators.set(workspaceId, workspaceSessions);
      }
      workspaceSessions.set(sessionId, coordinator);
    },
    
    removeSessionCoordinator: (workspaceId: string, sessionId: string) => {
      const workspaceSessions = sessionCoordinators.get(workspaceId);
      if (!workspaceSessions) return false;
      return workspaceSessions.delete(sessionId);
    }
  };
  
  return { managers, accessors };
}

/**
 * Load existing workspaces into memory
 */
async function loadWorkspaces(
  mandrakeManager: MandrakeManager,
  workspaceManagers: Map<string, WorkspaceManager>,
  mcpManagers: Map<string, MCPManager>,
  sessionCoordinators: Map<string, Map<string, SessionCoordinator>>
): Promise<void> {
  try {
    // Get workspace registry from MandrakeManager
    const workspaces = await mandrakeManager.listWorkspaces();
    
    // Load each workspace in parallel
    await Promise.all(
      Object.entries(workspaces).map(([id, config]) => 
        loadWorkspace(id, config.path, workspaceManagers, mcpManagers, sessionCoordinators)
      )
    );
  } catch (error) {
    console.error('Error loading workspaces:', error);
  }
}

/**
 * Load a single workspace into memory
 */
async function loadWorkspace(
  id: string,
  path: string,
  workspaceManagers: Map<string, WorkspaceManager>,
  mcpManagers: Map<string, MCPManager>,
  sessionCoordinators: Map<string, Map<string, SessionCoordinator>>
): Promise<void> {
  try {
    // Initialize WorkspaceManager
    const ws = new WorkspaceManager(path, id);
    await ws.init(id);
    workspaceManagers.set(ws.id, ws);
    
    // Initialize MCPManager for this workspace
    const mcpManager = new MCPManager();
    
    // Set up tools for this workspace if needed
    try {
      // Get workspace tool configuration and set up servers
      const toolConfigs = await ws.tools.listConfigSets();
      
      // For each tool config, potentially start an MCP server
      for (const [name, config] of Object.entries(toolConfigs)) {
        // Skip if no server configuration is available
        if (!config) continue;
        
        // Try to start the server with the provided config
        try {
          // Only start server if it has a valid command
          const serverConfig = Object.values(config)[0];
          if (serverConfig && serverConfig.command) {
            await mcpManager.startServer(name, config);
          }
        } catch (serverError) {
          console.warn(`Failed to start server for tool ${name}:`, serverError);
          // Continue with other tools even if this one fails
        }
      }
    } catch (toolsError) {
      console.warn(`Error loading tools for workspace ${id}:`, toolsError);
      // Continue workspace initialization even if tools fail
    }
    
    mcpManagers.set(ws.id, mcpManager);
    
    // Initialize empty session coordinators map for this workspace
    sessionCoordinators.set(ws.id, new Map<string, SessionCoordinator>());
    
  } catch (error) {
    console.error(`Error loading workspace ${id}:`, error);
  }
}

/**
 * Cleanup managers on application shutdown
 */
export async function cleanupManagers(managers: Managers): Promise<void> {
  // Cleanup system-level managers
  try {
    await managers.systemMcpManager.cleanup();
  } catch (error) {
    console.error('Error cleaning up system MCP manager:', error);
  }
  
  // Cleanup workspace-level managers
  for (const [workspaceId, mcpManager] of managers.mcpManagers.entries()) {
    try {
      await mcpManager.cleanup();
    } catch (error) {
      console.error(`Error cleaning up MCP manager for workspace ${workspaceId}:`, error);
    }
  }
}