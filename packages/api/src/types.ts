import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';

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

export interface ErrorResponse {
  error: string;
  status?: number;
}

export type ErrorHandler = (error: unknown, message: string) => ErrorResponse;