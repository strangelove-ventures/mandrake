/**
 * Helper functions for API routes to access services
 */
import { getServiceRegistry } from './registry';
import { initializeServices } from './init';
import { WorkspaceManager, MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import { createLogger } from '@mandrake/utils';

const logger = createLogger('ServiceHelpers');

/**
 * Get the MandrakeManager for system-level operations
 */
export async function getMandrakeManagerForRequest(): Promise<MandrakeManager> {
  await initializeServices();
  const registry = getServiceRegistry();
  
  logger.debug('Getting MandrakeManager');
  return registry.getMandrakeManager();
}

/**
 * Get a session coordinator for a specific session
 */
export async function getSessionCoordinatorForRequest(
  workspace: string,
  path: string,
  sessionId: string
): Promise<SessionCoordinator> {
  await initializeServices(); // Ensures initialization has happened
  const registry = getServiceRegistry();
  
  logger.debug(`Getting SessionCoordinator for workspace: ${workspace}, session: ${sessionId}`);
  return registry.getSessionCoordinator(workspace, path, sessionId);
}

/**
 * Get a workspace manager for a specific workspace
 */
export async function getWorkspaceManagerForRequest(
  workspace: string,
  path: string
): Promise<WorkspaceManager> {
  await initializeServices();
  const registry = getServiceRegistry();
  
  logger.debug(`Getting WorkspaceManager for workspace: ${workspace}`);
  return registry.getWorkspaceManager(workspace, path);
}

/**
 * Get an MCP manager for a specific workspace
 */
export async function getMCPManagerForRequest(
  workspace: string,
  path: string
): Promise<MCPManager> {
  await initializeServices();
  const registry = getServiceRegistry();
  
  logger.debug(`Getting MCPManager for workspace: ${workspace}`);
  return registry.getMCPManager(workspace, path);
}

/**
 * List all available workspaces
 */
export async function listWorkspacesForRequest(): Promise<{name: string; path: string; description?: string; lastOpened?: string;}[]> {
  await initializeServices();
  const registry = getServiceRegistry();
  const mandrakeManager = await registry.getMandrakeManager();
  
  logger.debug('Listing all workspaces');
  return mandrakeManager.listWorkspaces();
}

/**
 * Create a new workspace
 */
export async function createWorkspaceForRequest(
  name: string,
  description?: string
): Promise<WorkspaceManager> {
  await initializeServices();
  const registry = getServiceRegistry();
  const mandrakeManager = await registry.getMandrakeManager();
  
  logger.debug(`Creating workspace: ${name}`);
  return mandrakeManager.createWorkspace(name, description);
}

/**
 * Adopt an existing workspace from a specific location
 */
export async function adoptWorkspaceForRequest(
  name: string,
  path: string,
  description?: string
): Promise<WorkspaceManager> {
  await initializeServices();
  const registry = getServiceRegistry();
  const mandrakeManager = await registry.getMandrakeManager();
  
  logger.debug(`Adopting workspace: ${name} from path: ${path}`);
  return mandrakeManager.adoptWorkspace(name, path, description);
}

/**
 * Delete a workspace
 */
export async function deleteWorkspaceForRequest(name: string): Promise<void> {
  await initializeServices();
  const registry = getServiceRegistry();
  const mandrakeManager = await registry.getMandrakeManager();
  
  logger.debug(`Deleting workspace: ${name}`);
  await mandrakeManager.deleteWorkspace(name);
}

/**
 * Release resources for a session when no longer needed
 */
export async function releaseSessionResources(
  workspaceId: string,
  sessionId: string
): Promise<void> {
  await initializeServices();
  const registry = getServiceRegistry();
  
  logger.debug(`Releasing resources for session: ${sessionId} in workspace: ${workspaceId}`);
  await registry.releaseSessionCoordinator(workspaceId, sessionId);
}

/**
 * Release resources for a workspace when no longer needed
 */
export async function releaseWorkspaceResources(
  workspaceId: string
): Promise<void> {
  await initializeServices();
  const registry = getServiceRegistry();
  
  logger.debug(`Releasing resources for workspace: ${workspaceId}`);
  await registry.releaseWorkspaceResources(workspaceId);
}

/**
 * Manually trigger a cleanup of unused resources
 */
export async function triggerResourceCleanup(): Promise<void> {
  await initializeServices();
  const registry = getServiceRegistry();
  
  logger.debug('Manually triggering resource cleanup');
  await registry.performCleanup();
}
