import { WorkspaceManager } from '@mandrake/workspace';
import { ApiError, ErrorCode } from '../middleware/errorHandling';

let systemWorkspaceManager: WorkspaceManager | null = null;
const workspaceManagers = new Map<string, WorkspaceManager>();

/**
 * Sets the system workspace manager for global access
 * @param manager WorkspaceManager instance
 */
export function setSystemWorkspaceManager(manager: WorkspaceManager): void {
  systemWorkspaceManager = manager;
}

/**
 * Gets the system workspace manager
 * @returns System workspace manager
 * @throws ApiError if not initialized
 */
export function getSystemWorkspaceManager(): WorkspaceManager {
  if (!systemWorkspaceManager) {
    throw new ApiError(
      'System workspace manager not initialized',
      ErrorCode.SERVICE_UNAVAILABLE,
      503
    );
  }
  
  return systemWorkspaceManager;
}

/**
 * Caches a workspace manager for reuse
 * @param id Workspace ID
 * @param manager WorkspaceManager instance
 */
export function cacheWorkspaceManager(id: string, manager: WorkspaceManager): void {
  workspaceManagers.set(id, manager);
}

/**
 * Gets a workspace manager by ID (from cache or creates new)
 * @param id Workspace ID
 * @returns WorkspaceManager instance
 * @throws ApiError if workspace not found
 */
export async function getWorkspaceManager(id: string): Promise<WorkspaceManager> {
  // Check cache first
  if (workspaceManagers.has(id)) {
    return workspaceManagers.get(id)!;
  }
  
  try {
    // Get system manager to access workspaces
    const systemManager = getSystemWorkspaceManager();
    
    // Try to load workspace by ID or name
    // Implementation depends on how your WorkspaceManager factory works
    const workspaceManager = await loadWorkspaceManager(id);
    
    // Cache for future use
    cacheWorkspaceManager(id, workspaceManager);
    
    return workspaceManager;
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
 * Helper function to load a workspace manager
 * @param id Workspace ID or name
 * @returns WorkspaceManager instance
 */
async function loadWorkspaceManager(id: string): Promise<WorkspaceManager> {
  // This is a placeholder - actual implementation depends on your workspace system
  // You would typically use a workspace factory or registry here
  
  // For example:
  const systemManager = getSystemWorkspaceManager();
  // const workspaceList = await systemManager.listWorkspaces();
  // const workspace = workspaceList.find(w => w.id === id || w.name === id);
  
  // if (!workspace) {
  //   throw new Error(`Workspace not found: ${id}`);
  // }
  
  // return new WorkspaceManager(workspace.path, workspace.name);
  
  // Since we don't have the actual implementation, we'll throw for now
  throw new Error(`Not implemented: loadWorkspaceManager(${id})`);
}