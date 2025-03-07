import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import { ErrorResponse } from '@mandrake/utils/src/types/api';

// Re-export all API types from utils
export * from '@mandrake/utils/src/types/api';

// Internal types not exposed to clients
export interface Managers {
  // System-level managers
  mandrakeManager: MandrakeManager;
  systemMcpManager: MCPManager;
  systemSessionCoordinators: Map<string, SessionCoordinator>;

  // Workspace-level managers
  workspaceManagers: Map<string, WorkspaceManager>;
  mcpManagers: Map<string, MCPManager>;
  sessionCoordinators: Map<string, Map<string, SessionCoordinator>>;
}

export interface ManagerAccessors {
  getWorkspaceManager: (workspaceId: string) => WorkspaceManager | undefined;
  getMcpManager: (workspaceId: string) => MCPManager | undefined;
  getSessionCoordinator: (workspaceId: string, sessionId: string) => SessionCoordinator | undefined;
  getSessionCoordinatorMap: (workspaceId: string) => Map<string, SessionCoordinator> | undefined;
  createSessionCoordinator: (workspaceId: string, sessionId: string, coordinator: SessionCoordinator) => void;
  removeSessionCoordinator: (workspaceId: string, sessionId: string) => boolean;
}

export interface ApiEnv {
  mandrakeHome?: string;
}

export interface StreamingOptions {
  contentType: string;
}

export type ErrorHandler = (error: unknown, message: string) => ErrorResponse;