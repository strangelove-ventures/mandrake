import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import { ApiError, ErrorCode } from '../middleware/errorHandling';

// Singleton instances
let mandrakeManager: MandrakeManager;
let mcpManager: MCPManager;

/**
 * Gets or initializes the MandrakeManager singleton
 * @returns MandrakeManager instance
 */
export function getMandrakeManager(): MandrakeManager {
  if (!mandrakeManager) {
    const rootPath = process.env.MANDRAKE_ROOT || `${process.env.HOME || ''}/.mandrake`;
    mandrakeManager = new MandrakeManager(rootPath);
    
    // Initialize if needed (this should be done during app startup)
    if (!mandrakeManager) {
      throw new ApiError(
        'Mandrake manager not initialized',
        ErrorCode.SERVICE_UNAVAILABLE,
        503
      );
    }
  }
  
  return mandrakeManager;
}

/**
 * Gets or initializes the MCPManager singleton
 * @returns MCPManager instance
 */
export function getMCPManager(): MCPManager {
  if (!mcpManager) {
    mcpManager = new MCPManager();
  }
  
  return mcpManager;
}

/**
 * Gets a workspace manager by ID
 * @param id Workspace ID
 * @returns WorkspaceManager instance
 * @throws ApiError if workspace not found
 */
export async function getWorkspaceManagerById(id: string): Promise<WorkspaceManager> {
  try {
    const manager = getMandrakeManager();
    return await manager.getWorkspace(id);
  } catch (error) {
    throw new ApiError(
      `Workspace not found: ${id}`,
      ErrorCode.RESOURCE_NOT_FOUND,
      404,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Creates a session coordinator for system-level operations
 * @returns SessionCoordinator instance
 */
export function createSystemSessionCoordinator(): SessionCoordinator {
  const mandrake = getMandrakeManager();
  
  return new SessionCoordinator({
    metadata: {
      name: 'system',
      path: mandrake.paths.root
    },
    promptManager: mandrake.prompt,
    sessionManager: mandrake.sessions,
    mcpManager: getMCPManager(),
    modelsManager: mandrake.models
    // System level doesn't have files or dynamic context managers
  });
}

/**
 * Creates a session coordinator for workspace operations
 * @param workspace WorkspaceManager instance
 * @returns SessionCoordinator instance
 */
export function createWorkspaceSessionCoordinator(workspace: WorkspaceManager): SessionCoordinator {
  return new SessionCoordinator({
    metadata: {
      name: workspace.name,
      // id: workspace.id,
      path: workspace.paths.root
    },
    promptManager: workspace.prompt,
    sessionManager: workspace.sessions,
    mcpManager: getMCPManager(),
    modelsManager: workspace.models,
    filesManager: workspace.files,
    dynamicContextManager: workspace.dynamic
  });
}

/**
 * Ensures required MCP servers are running for the active tool set
 * @param workspaceId Optional workspace ID for workspace-specific tools
 */
export async function ensureActiveMCPServers(workspaceId?: string): Promise<void> {
  try {
    // Get toolsManager (from workspace or system)
    let toolsManager;
    if (workspaceId) {
      const workspace = await getWorkspaceManagerById(workspaceId);
      toolsManager = workspace.tools;
    } else {
      const mandrake = getMandrakeManager();
      toolsManager = mandrake.tools;
    }

    // Get MCP manager
    const mcp = getMCPManager();
    
    // Get active tool set
    const activeSetId = await toolsManager.getActive();
    const activeSet = await toolsManager.getConfigSet(activeSetId);
    
    // Start required servers that aren't already running
    for (const [serverId, config] of Object.entries(activeSet)) {
      if (!config.disabled) {
        // Check if server is already running
        const server = mcp.getServer(serverId);
        if (!server) {
          // Start server if not running
          await mcp.startServer(serverId, config);
        }
      }
    }
  } catch (error) {
    console.error('Failed to ensure active MCP servers:', error);
    throw new ApiError(
      `Failed to ensure active MCP servers: ${error instanceof Error ? error.message : String(error)}`,
      ErrorCode.INTERNAL_ERROR,
      500,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Initializes the mandrake and MCP managers
 * Call this during app initialization
 */
export async function initializeManagers(): Promise<void> {
  try {
    // Initialize mandrake manager
    const manager = getMandrakeManager();
    await manager.init();
    
    // Initialize MCP manager and start active tools
    await ensureActiveMCPServers();
    
    console.log('Mandrake managers initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Mandrake managers:', error);
    throw error;
  }
}

/**
 * Handles application shutdown, cleaning up resources
 */
export async function shutdownManagers(): Promise<void> {
  try {
    // Clean up MCP manager servers
    if (mcpManager) {
      await mcpManager.cleanup();
    }
    
    console.log('Mandrake managers shut down successfully');
  } catch (error) {
    console.error('Failed to shut down Mandrake managers:', error);
    throw error;
  }
}

/**
 * Resets managers (used for testing only)
 */
export function resetManagersForTesting(): void {
  mandrakeManager = undefined as any;
  mcpManager = undefined as any;
}
