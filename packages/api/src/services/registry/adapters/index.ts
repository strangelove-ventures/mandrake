/**
 * Service Registry Adapters
 * 
 * This file exports all adapters for the service registry
 */

// Export all adapters
export { MCPManagerAdapter } from './mcp-manager-adapter';
export { WorkspaceManagerAdapter } from './workspace-manager-adapter';
export { MandrakeManagerAdapter } from './mandrake-manager-adapter';
export { SessionCoordinatorAdapter } from './session-coordinator-adapter';

// Re-export helper functions for convenient imports
export { 
  createAndRegisterService, 
  createAndRegisterWorkspaceService 
} from '../';