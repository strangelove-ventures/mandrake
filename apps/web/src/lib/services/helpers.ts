import { getServiceRegistry } from './registry';
import { WorkspaceManager, MandrakeManager, SessionManager, DynamicContextManager, PromptManager, ModelsManager, ToolsManager, FilesManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import { createLogger } from '@mandrake/utils';

// Re-export types for convenience
export { WorkspaceManager, MandrakeManager, SessionManager, DynamicContextManager, PromptManager, ModelsManager, ToolsManager, FilesManager };

const logger = createLogger('ServiceHelpers');

// Keep a singleton for the system MCP manager
let systemMCPManager: MCPManager | null = null;

/**
 * Get the MandrakeManager for system-level operations
 */
export async function getMandrakeManagerForRequest(): Promise<MandrakeManager> {
  const registry = getServiceRegistry();
  
  logger.debug('Getting MandrakeManager');
  return registry.getMandrakeManager();
}

/**
 * Get a session coordinator for a specific session
 * @param workspaceId Unique identifier for the workspace
 * @param sessionId Unique identifier for the session
 */
export async function getSessionCoordinatorForRequest(
  workspaceId: string,
  sessionId: string
): Promise<SessionCoordinator> {
  const registry = getServiceRegistry();
  
  logger.debug(`Getting SessionCoordinator for workspace: ${workspaceId}, session: ${sessionId}`);
  
  // Get the workspace manager to get the correct workspace path
  const workspaceManager = await getWorkspaceManagerForRequest(workspaceId);
  return registry.getSessionCoordinator(workspaceId, workspaceManager.paths.root, sessionId);
}

/**
 * Get a workspace manager for a specific workspace
 * @param workspaceId Unique identifier for the workspace
 */
export async function getWorkspaceManagerForRequest(
  workspaceId: string
): Promise<WorkspaceManager> {
  const registry = getServiceRegistry();
  
  logger.debug(`Getting WorkspaceManager for workspace: ${workspaceId}`);
  
  // Get the workspace through the MandrakeManager
  const mandrakeManager = await registry.getMandrakeManager();
  const mgr = await mandrakeManager.getWorkspace(workspaceId);
  await mgr.init()
  return mgr
}

/**
 * Get a system-level MCP manager
 * This manager is shared across system-level operations
 */
export async function getSystemMCPManagerForRequest(): Promise<MCPManager> {
  if (!systemMCPManager) {
    logger.debug('Creating new system-level MCPManager');
    
    // Get mandrake tools manager to get tool configs
    const mandrakeManager = await getMandrakeManagerForRequest();
    const toolsManager = mandrakeManager.tools;
    
    // Create new MCP manager
    systemMCPManager = new MCPManager();
    
    // Start servers from active set
    try {
      const activeSet = await toolsManager.getActive();
      const tools = await toolsManager.getConfigSet(activeSet);
      
      for (const [name, config] of Object.entries(tools)) {
        if (!config.disabled) {
          try {
            await systemMCPManager.startServer(name, config);
            logger.debug(`Started system server: ${name}`);
          } catch (error) {
            logger.error(`Failed to start system server ${name}:`, (error as Error));
          }
        }
      }
    } catch (error) {
      logger.error('Failed to initialize system MCP servers:', (error as Error));
    }
  }
  
  return systemMCPManager;
}

/**
 * Get an MCP manager for a specific workspace
 * @param workspaceId Unique identifier for the workspace
 */
export async function getMCPManagerForRequest(
  workspaceId?: string
): Promise<MCPManager> {
  // If no workspace ID is provided, return the system MCP manager
  if (!workspaceId) {
    return getSystemMCPManagerForRequest();
  }
  
  const registry = getServiceRegistry();
  
  logger.debug(`Getting MCPManager for workspace: ${workspaceId}`);
  
  // Get the workspace to ensure we have the correct path
  const workspaceManager = await getWorkspaceManagerForRequest(workspaceId);
  return registry.getMCPManager(workspaceId, workspaceManager.paths.root);
}

/**
 * List all available workspaces
 * @returns Array of workspace details including ID, name, path, description, and lastOpened
 */
export async function listWorkspacesForRequest(): Promise<{id: string; name: string; path: string; description?: string; lastOpened?: string;}[]> {
  const registry = getServiceRegistry();
  const mandrakeManager = await registry.getMandrakeManager();
  
  logger.debug('Listing all workspaces');
  return mandrakeManager.listWorkspaces();
}

/**
 * Create a new workspace
 * @param name Name for the new workspace
 * @param description Optional description for the workspace
 * @param path Optional custom path for the workspace
 * @returns The created workspace manager
 */
export async function createWorkspaceForRequest(
  name: string,
  description?: string,
  path?: string
): Promise<WorkspaceManager> {
  const registry = getServiceRegistry();
  const mandrakeManager = await registry.getMandrakeManager();
  
  logger.debug(`Creating workspace: ${name}`);
  return mandrakeManager.createWorkspace(name, description, path);
}

/**
 * Adopt an existing workspace from a specific location
 * @param name Name for the workspace
 * @param path Path to existing workspace
 * @param description Optional description for the workspace
 * @returns The adopted workspace manager
 */
export async function adoptWorkspaceForRequest(
  name: string,
  path: string,
  description?: string
): Promise<WorkspaceManager> {
  const registry = getServiceRegistry();
  const mandrakeManager = await registry.getMandrakeManager();
  
  logger.debug(`Adopting workspace: ${name} from path: ${path}`);
  return mandrakeManager.adoptWorkspace(name, path, description);
}

/**
 * Delete a workspace
 * @param workspaceId Unique identifier for the workspace to delete
 */
export async function deleteWorkspaceForRequest(workspaceId: string): Promise<void> {
  const registry = getServiceRegistry();
  const mandrakeManager = await registry.getMandrakeManager();
  
  logger.debug(`Deleting workspace: ${workspaceId}`);
  await mandrakeManager.deleteWorkspace(workspaceId);
}

/**
 * Release resources for a session when no longer needed
 * @param workspaceId Unique identifier for the workspace
 * @param sessionId Unique identifier for the session
 */
export async function releaseSessionResources(
  workspaceId: string,
  sessionId: string
): Promise<void> {
  const registry = getServiceRegistry();
  
  logger.debug(`Releasing resources for session: ${sessionId} in workspace: ${workspaceId}`);
  await registry.releaseSessionCoordinator(workspaceId, sessionId);
}

/**
 * Release resources for a workspace when no longer needed
 * @param workspaceId Unique identifier for the workspace
 */
export async function releaseWorkspaceResources(
  workspaceId: string
): Promise<void> {
  const registry = getServiceRegistry();
  
  logger.debug(`Releasing resources for workspace: ${workspaceId}`);
  await registry.releaseWorkspaceResources(workspaceId);
}

/**
 * Manually trigger a cleanup of unused resources
 */
export async function triggerResourceCleanup(): Promise<void> {
  const registry = getServiceRegistry();
  
  logger.debug('Manually triggering resource cleanup');
  await registry.performCleanup();
}

/**
 * Get a specific manager from a workspace
 * @template T The type of manager to get
 * @param workspaceId Unique identifier for the workspace
 * @param managerKey The key of the manager in the workspace
 * @returns The requested manager
 */
export async function getManagerForWorkspace<T>(workspaceId: string, managerKey: keyof WorkspaceManager): Promise<T> {
  const workspaceManager = await getWorkspaceManagerForRequest(workspaceId);
  return workspaceManager[managerKey] as unknown as T;
}

/**
 * Get a specific manager from the MandrakeManager
 * @template T The type of manager to get
 * @param managerKey The key of the manager in the MandrakeManager
 * @returns The requested manager
 */
export async function getManagerFromMandrake<T>(managerKey: keyof MandrakeManager): Promise<T> {
  const mandrakeManager = await getMandrakeManagerForRequest();
  return mandrakeManager[managerKey] as unknown as T;
}

/**
 * Get the config manager for a workspace
 * @param workspaceId Unique identifier for the workspace
 * @returns The workspace's config manager
 */
export async function getWorkspaceConfigManager(workspaceId: string) {
  const workspaceManager = await getWorkspaceManagerForRequest(workspaceId);
  return workspaceManager.config;
}

/**
 * Get the config manager for the mandrake system
 * @returns The mandrake's config manager
 */
export async function getMandrakeConfigManager() {
  const mandrakeManager = await getMandrakeManagerForRequest();
  return mandrakeManager.config;
}

/**
 * Clean up system resources during shutdown or testing
 */
export async function cleanupSystemResources(): Promise<void> {
  if (systemMCPManager) {
    logger.debug('Cleaning up system MCP manager');
    await systemMCPManager.cleanup();
    systemMCPManager = null;
  }
}