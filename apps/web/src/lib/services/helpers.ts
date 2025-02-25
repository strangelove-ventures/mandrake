/**
 * Helper functions for API routes to access services
 */
import { getServiceRegistry } from './registry';
import { initializeServices } from './init';
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import { createLogger } from '@mandrake/utils';

const logger = createLogger('ServiceHelpers');

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
export async function listWorkspaces() {
  await initializeServices();
  
  logger.debug('Listing all workspaces');
  
  // Placeholder: we should get this list of workspaces from the mandrake manager
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
