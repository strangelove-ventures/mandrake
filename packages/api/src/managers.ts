import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import type { SessionCoordinator } from '@mandrake/session';
import { join } from 'path';
import { readdir } from 'fs/promises';
import type { Managers, ManagerAccessors } from './types';
import { loadWorkspace } from './routes/workspace';

/**
 * Initialize managers with a specified home directory
 * @param mandrakeHome The home directory for Mandrake
 * @returns Initialized managers and accessor functions
 */
export async function initializeManagers(mandrakeHome?: string): Promise<{ managers: Managers, accessors: ManagerAccessors }> {
  try {
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
    
    // Load existing workspaces - errors are handled internally
    try {
      await loadWorkspaces(mandrakeManager, workspaceManagers, mcpManagers, sessionCoordinators);
    } catch (error) {
      console.error('Failed to load workspaces, but continuing with startup:', error);
    }
    
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
  } catch (error) {
    console.error('Critical error initializing managers:', error);
    throw error;
  }
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
      workspaces.map(workspace => 
        loadWorkspace(workspace.id, workspace.path, workspaceManagers, mcpManagers, sessionCoordinators, mandrakeManager)
      )
    );
  } catch (error) {
    console.error('Error loading workspaces:', error);
  }
}

// loadWorkspace function moved to ./routes/workspace.ts

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