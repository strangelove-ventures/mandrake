import { WorkspaceManager, MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import { createLogger } from '@mandrake/utils';
import { IServiceRegistry, ServiceActivity, ExtendedSessionMetadata } from './types';
import { join } from 'path';

const logger = createLogger('ServiceRegistry');

/**
 * Registry to track and manage all service instances
 */
class ServiceRegistry implements IServiceRegistry {
  private mandrakeManager: MandrakeManager | null = null;
  private workspaceManagers: Map<string, WorkspaceManager> = new Map(); // Key is workspace ID
  public sessionCoordinators: Map<string, SessionCoordinator> = new Map(); // Key is "workspaceId:sessionId"
  public mcpManagers: Map<string, MCPManager> = new Map(); // Key is workspace ID

  // Activity tracking
  private mandrakeActivity: ServiceActivity | null = null;
  private workspaceActivity: Map<string, ServiceActivity> = new Map(); // Key is workspace ID
  private sessionActivity: Map<string, ServiceActivity> = new Map(); // Key is "workspaceId:sessionId"

  // Resource limits
  private readonly maxConcurrentSessions: number = 10; // Configurable

  /**
   * Get the MandrakeManager instance
   */
  async getMandrakeManager(): Promise<MandrakeManager> {
    // Update activity tracking
    this.mandrakeActivity = {
      lastUsed: new Date(),
      isActive: true
    };

    if (!this.mandrakeManager) {
      // Always use MANDRAKE_ROOT if set, or create a path in the home directory
      const mandrakeRoot = process.env.MANDRAKE_ROOT || join(process.env.HOME || '', '.mandrake');
      logger.info(`Creating new MandrakeManager`, { path: mandrakeRoot });

      const manager = new MandrakeManager(mandrakeRoot);
      await manager.init();
      this.mandrakeManager = manager;
    }

    return this.mandrakeManager;
  }

  /**
   * Get or create a workspace manager for a specific workspace
   * @param workspaceId ID of the workspace to retrieve
   * @param path Optional path to create a new workspace if it doesn't exist
   */
  async getWorkspaceManager(workspaceId: string, path?: string): Promise<WorkspaceManager> {
    // First check if we have it cached
    if (this.workspaceManagers.has(workspaceId)) {
      // Update activity timestamp
      this.workspaceActivity.set(workspaceId, {
        lastUsed: new Date(),
        isActive: true
      });
      return this.workspaceManagers.get(workspaceId)!;
    }

    // If not cached, try to get from MandrakeManager
    try {
      const mandrakeManager = await this.getMandrakeManager();

      try {
        // Always try to get the workspace from MandrakeManager first
        const manager = await mandrakeManager.getWorkspace(workspaceId);
        this.workspaceManagers.set(workspaceId, manager);
        this.workspaceActivity.set(workspaceId, {
          lastUsed: new Date(),
          isActive: true
        });
        logger.info(`Retrieved WorkspaceManager for workspace: ${workspaceId}`);
        return manager;
      } catch (error) {
        // If not found and path provided, we might want to create or adopt a workspace
        if (path) {
          // Generate a unique name for the workspace based on the ID
          const name = `workspace-${workspaceId.slice(0, 8)}`;

          logger.info(`Workspace ${workspaceId} not found, adopting or creating at path: ${path}`);

          try {
            // Try to adopt the workspace if it exists at the path
            const manager = await mandrakeManager.adoptWorkspace(name, path);
            this.workspaceManagers.set(manager.id, manager);
            this.workspaceActivity.set(manager.id, {
              lastUsed: new Date(),
              isActive: true
            });
            logger.info(`Adopted workspace at ${path} with ID: ${manager.id}`);
            return manager;
          } catch (adoptError) {
            // If adoption fails, create a new workspace
            const manager = await mandrakeManager.createWorkspace(name, undefined, path);
            this.workspaceManagers.set(manager.id, manager);
            this.workspaceActivity.set(manager.id, {
              lastUsed: new Date(),
              isActive: true
            });
            logger.info(`Created new workspace at ${path} with ID: ${manager.id}`);
            return manager;
          }
        }

        // If we reach here, the workspace doesn't exist and we don't have a path to create it
        logger.error(`Workspace not found: ${workspaceId} and no path provided to create it`);
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
    } catch (error) {
      logger.error(`Failed to get or create workspace: ${workspaceId}`, { error });
      throw new Error(`Failed to get or create workspace: ${workspaceId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get or create an MCP manager for a specific workspace
   */
  async getMCPManager(workspaceId: string, path?: string): Promise<MCPManager> {
    if (!this.mcpManagers.has(workspaceId)) {
      logger.info(`Creating new MCPServerManager for workspace: ${workspaceId}`);
      const workspaceManager = await this.getWorkspaceManager(workspaceId, path);
      const manager = new MCPManager();
      const activeSet = await workspaceManager.tools.getActive();
      const tools = await workspaceManager.tools.getConfigSet(activeSet);
      for (const [name, config] of Object.entries(tools)) {
        await manager.startServer(name, config);
      }
      this.mcpManagers.set(workspaceId, manager);
    }

    // Update workspace activity when MCP manager is accessed
    this.workspaceActivity.set(workspaceId, {
      lastUsed: new Date(),
      isActive: true
    });

    return this.mcpManagers.get(workspaceId)!;
  }

  /**
   * Get or create a session coordinator for a specific session
   */
  async getSessionCoordinator(workspaceId: string, path: string, sessionId: string): Promise<SessionCoordinator> {
    const key = `${workspaceId}:${sessionId}`;

    if (!this.sessionCoordinators.has(key)) {
      logger.info(`Creating new SessionCoordinator for session: ${sessionId} in workspace: ${workspaceId}`);

      // Check resource limits
      if (this.sessionCoordinators.size >= this.maxConcurrentSessions) {
        // Find least recently used session and release it
        await this.releaseOldestSession();
      }

      const workspaceManager = await this.getWorkspaceManager(workspaceId, path);
      
      // Always ensure SessionManager is initialized before using it in the coordinator
      try {
        // Try to safely initialize the session manager
        logger.debug(`Initializing SessionManager for workspace: ${workspaceId}`);
        await workspaceManager.sessions.init();
      } catch (error) {
        // If it's already initialized, that's fine
        logger.debug(`SessionManager might already be initialized: ${error}`);
      }
      
      const mcpManager = await this.getMCPManager(workspaceId, path);

      const coordinator = new SessionCoordinator({
        logger: createLogger(`SessionCoordinator:${sessionId}`),
        metadata: {
          workspaceId: workspaceManager.id,
          name: workspaceManager.name,
          path: workspaceManager.paths.root
        } as ExtendedSessionMetadata,
        sessionManager: workspaceManager.sessions,
        promptManager: workspaceManager.prompt,
        mcpManager,
        modelsManager: workspaceManager.models,
        filesManager: workspaceManager.files,
        dynamicContextManager: workspaceManager.dynamic,
      });

      this.sessionCoordinators.set(key, coordinator);

      // Track activity
      this.sessionActivity.set(key, {
        lastUsed: new Date(),
        isActive: true
      });
    } else {
      // Update activity timestamp
      this.sessionActivity.set(key, {
        lastUsed: new Date(),
        isActive: true
      });
    }

    return this.sessionCoordinators.get(key)!;
  }

  /**
   * Clean up a session coordinator when no longer needed
   */
  async releaseSessionCoordinator(workspaceId: string, sessionId: string): Promise<void> {
    const key = `${workspaceId}:${sessionId}`;

    if (this.sessionCoordinators.has(key)) {
      const coordinator = this.sessionCoordinators.get(key)!;
      logger.info(`Releasing SessionCoordinator for session: ${sessionId}`);
      await coordinator.cleanup();
      this.sessionCoordinators.delete(key);
      this.sessionActivity.delete(key);
    }
  }

  /**
   * Clean up resources for a workspace when not in use
   */
  async releaseWorkspaceResources(workspaceId: string): Promise<void> {
    // Clean up all session coordinators for this workspace
    const sessionKeys = Array.from(this.sessionCoordinators.keys())
      .filter(key => key.startsWith(`${workspaceId}:`));

    for (const key of sessionKeys) {
      const sessionId = key.split(':')[1];
      await this.releaseSessionCoordinator(workspaceId, sessionId);
    }

    // Clean up MCP manager
    if (this.mcpManagers.has(workspaceId)) {
      const mcpManager = this.mcpManagers.get(workspaceId)!;
      await mcpManager.cleanup();
      this.mcpManagers.delete(workspaceId);
    }

    // Clean up workspace manager
    if (this.workspaceManagers.has(workspaceId)) {
      // No cleanup method in WorkspaceManager currently
      // If one is added in the future, call it here
      this.workspaceManagers.delete(workspaceId);
      this.workspaceActivity.delete(workspaceId);
    }
  }

  /**
   * Release MandrakeManager resources
   */
  async releaseMandrakeManager(): Promise<void> {
    if (this.mandrakeManager) {
      logger.info('Cleaning up MandrakeManager resources');

      // No cleanup method in MandrakeManager currently
      // If one is added in the future, call it here

      this.mandrakeManager = null;
      this.mandrakeActivity = null;
    }
  }

  /**
   * Perform periodic cleanup of unused resources
   */
  async performCleanup(): Promise<void> {
    logger.info('Performing cleanup of unused service instances');

    const now = new Date();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds

    // Clean up inactive sessions
    for (const [key, activity] of this.sessionActivity.entries()) {
      const elapsed = now.getTime() - activity.lastUsed.getTime();

      if (elapsed > inactivityThreshold) {
        const [workspaceId, sessionId] = key.split(':');
        logger.info(`Session ${sessionId} inactive for ${elapsed / 1000 / 60} minutes, releasing`);
        await this.releaseSessionCoordinator(workspaceId, sessionId);
      }
    }

    // Clean up inactive workspaces (if no active sessions)
    for (const [workspaceId, activity] of this.workspaceActivity.entries()) {
      const elapsed = now.getTime() - activity.lastUsed.getTime();

      if (elapsed > inactivityThreshold) {
        // Check if any sessions for this workspace are still active
        const hasActiveSessions = Array.from(this.sessionActivity.keys())
          .some(key => key.startsWith(`${workspaceId}:`));

        if (!hasActiveSessions) {
          logger.info(`Workspace ${workspaceId} inactive for ${elapsed / 1000 / 60} minutes with no active sessions, releasing`);
          await this.releaseWorkspaceResources(workspaceId);
        }
      }
    }

    // Check MandrakeManager for inactivity
    if (this.mandrakeActivity && this.mandrakeActivity.isActive) {
      const elapsed = now.getTime() - this.mandrakeActivity.lastUsed.getTime();
      if (elapsed > inactivityThreshold) {
        // Check if any workspaces still need it
        const hasActiveWorkspaces = this.workspaceActivity.size > 0;

        if (!hasActiveWorkspaces) {
          logger.info(`MandrakeManager inactive for ${elapsed / 1000 / 60} minutes with no active workspaces, releasing`);
          await this.releaseMandrakeManager();
        }
      }
    }
  }

  /**
   * Find and release the oldest session (used when hitting resource limits)
   */
  private async releaseOldestSession(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, activity] of this.sessionActivity.entries()) {
      if (activity.lastUsed.getTime() < oldestTime) {
        oldestTime = activity.lastUsed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const [workspaceId, sessionId] = oldestKey.split(':');
      logger.info(`Releasing oldest session ${sessionId} due to resource limits`);
      await this.releaseSessionCoordinator(workspaceId, sessionId);
    }
  }
}

// Singleton instance
let registryInstance: ServiceRegistry | null = null;

export function getServiceRegistry(): ServiceRegistry {
  if (!registryInstance) {
    registryInstance = new ServiceRegistry();
  }
  return registryInstance;
}
export async function resetServiceRegistryForTesting(): Promise<void> {
  if (registryInstance) {
    // Clean up all session coordinators
    for (const [key, _] of registryInstance.sessionCoordinators.entries()) {
      const [workspaceId, sessionId] = key.split(':');
      await registryInstance.releaseSessionCoordinator(workspaceId, sessionId);
    }

    // Clean up all MCP managers
    for (const [workspaceId, _] of registryInstance.mcpManagers.entries()) {
      await registryInstance.releaseWorkspaceResources(workspaceId);
    }

    // Clean up MandrakeManager
    await registryInstance.releaseMandrakeManager();
  }

  registryInstance = null;
}