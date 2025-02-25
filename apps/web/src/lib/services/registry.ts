/**
 * Service Registry implementation
 */
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator, type SessionMetadata } from '@mandrake/session';
import { createLogger } from '@mandrake/utils';
import { IServiceRegistry, ServiceActivity } from './types';

const logger = createLogger('ServiceRegistry');

/**
 * Registry to track and manage all service instances
 */
class ServiceRegistry implements IServiceRegistry {
  private workspaceManagers: Map<string, WorkspaceManager> = new Map();
  private mcpManagers: Map<string, MCPManager> = new Map();
  private sessionCoordinators: Map<string, SessionCoordinator> = new Map();
  
  // Activity tracking
  private workspaceActivity: Map<string, ServiceActivity> = new Map();
  private sessionActivity: Map<string, ServiceActivity> = new Map();
  
  // Resource limits
  private readonly maxConcurrentSessions: number = 10; // Configurable

  /**
   * Get or create a workspace manager for a specific workspace
   */
  async getWorkspaceManager(name: string, path: string): Promise<WorkspaceManager> {
    if (!this.workspaceManagers.has(name)) {
      logger.info(`Creating new WorkspaceManager for workspace: ${name}`, { workspace: name, path });
      // FIX: WorkspaceManager constructor expects (path, name), not (name, path)
      const manager = new WorkspaceManager(path, name);
      await manager.init();
      this.workspaceManagers.set(name, manager);
      
      // Track activity
      this.workspaceActivity.set(name, {
        lastUsed: new Date(),
        isActive: true
      });
    } else {
      // Update activity timestamp
      this.workspaceActivity.set(name, {
        lastUsed: new Date(),
        isActive: true
      });
    }
    
    return this.workspaceManagers.get(name)!;
  }
  
  /**
   * Get or create an MCP manager for a specific workspace
   */
  async getMCPManager(workspace: string, path: string): Promise<MCPManager> {
    if (!this.mcpManagers.has(workspace)) {
      logger.info(`Creating new MCPServerManager for workspace: ${workspace}`);
      const workspaceManager = await this.getWorkspaceManager(workspace, path);
      const manager = new MCPManager();
      const tools = await workspaceManager.tools.getConfigSet(await workspaceManager.tools.getActive())
      for (const [name, config] of Object.entries(tools)) {
        await manager.startServer(name, config);
      }
      this.mcpManagers.set(workspace, manager);
    }
    
    // Update workspace activity when MCP manager is accessed
    this.workspaceActivity.set(workspace, {
      lastUsed: new Date(),
      isActive: true
    });
    
    return this.mcpManagers.get(workspace)!;
  }
  
  /**
   * Get or create a session coordinator for a specific session
   */
  async getSessionCoordinator(workspace: string, path: string, sessionId: string): Promise<SessionCoordinator> {
    const key = `${workspace}:${sessionId}`;
    
    if (!this.sessionCoordinators.has(key)) {
      logger.info(`Creating new SessionCoordinator for session: ${sessionId} in workspace: ${workspace}`);
      
      // Check resource limits
      if (this.sessionCoordinators.size >= this.maxConcurrentSessions) {
        // Find least recently used session and release it
        await this.releaseOldestSession();
      }
      
      const workspaceManager = await this.getWorkspaceManager(workspace, path);
      const mcpManager = await this.getMCPManager(workspace, path);
      
      const coordinator = new SessionCoordinator({
        logger: createLogger(`SessionCoordinator:${sessionId}`),
        metadata: {
          name: workspace,
          path
        } as SessionMetadata,
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
  async releaseSessionCoordinator(workspace: string, sessionId: string): Promise<void> {
    const key = `${workspace}:${sessionId}`;
    
    if (this.sessionCoordinators.has(key)) {
      const coordinator = this.sessionCoordinators.get(key)!;
      logger.info(`Releasing SessionCoordinator for session: ${sessionId}`);
      await coordinator.cleanup()
      this.sessionCoordinators.delete(key);
      this.sessionActivity.delete(key);
    }
  }
  
  /**
   * Clean up resources for a workspace when not in use
   */
  async releaseWorkspaceResources(workspace: string): Promise<void> {
    // Clean up all session coordinators for this workspace
    const sessionKeys = Array.from(this.sessionCoordinators.keys())
      .filter(key => key.startsWith(`${workspace}:`));
    
    for (const key of sessionKeys) {
      const sessionId = key.split(':')[1];
      await this.releaseSessionCoordinator(workspace, sessionId);
    }
    
    // Clean up MCP manager
    if (this.mcpManagers.has(workspace)) {
      const mcpManager = this.mcpManagers.get(workspace)!;
      await mcpManager.cleanup();
      this.mcpManagers.delete(workspace);
    }
    
    // Clean up workspace manager
    if (this.workspaceManagers.has(workspace)) {
      const workspaceManager = this.workspaceManagers.get(workspace)!;
      // await workspaceManager.cleanup();
      this.workspaceManagers.delete(workspace);
      this.workspaceActivity.delete(workspace);
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
        logger.info(`Session ${sessionId} inactive for ${elapsed/1000/60} minutes, releasing`);
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
          logger.info(`Workspace ${workspaceId} inactive for ${elapsed/1000/60} minutes with no active sessions, releasing`);
          await this.releaseWorkspaceResources(workspaceId);
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
