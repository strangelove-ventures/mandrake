/**
 * Type definitions for services
 */

// Import actual types from respective packages
import { WorkspaceManager, MandrakeManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';

/**
 * Service registry interface
 */
export interface IServiceRegistry {
  getWorkspaceManager(name: string, path: string): Promise<WorkspaceManager>;
  getMCPManager(workspace: string, path: string): Promise<MCPManager>;
  getSessionCoordinator(workspace: string, path: string, sessionId: string): Promise<SessionCoordinator>;
  getMandrakeManager(): Promise<MandrakeManager>;
  
  releaseSessionCoordinator(workspace: string, sessionId: string): Promise<void>;
  releaseWorkspaceResources(workspace: string): Promise<void>;
  releaseMandrakeManager(): Promise<void>;
  performCleanup(): Promise<void>;
}

/**
 * Options for streaming message processing
 */
export interface StreamOptions {
  message: string;
  onToken: (token: string) => void;
  onToolCall?: (toolCall: any) => void;
  onToolResult?: (toolResult: any) => void;
  onComplete: () => void;
  onError?: (error: Error) => void;
}

/**
 * Service activity tracking
 */
export interface ServiceActivity {
  lastUsed: Date;
  isActive: boolean;
}
