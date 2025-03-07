// Re-export types from utils package
import type {
  MCPConnection,
  MCPToolWithServer as ToolWithServer,
  MCPServerConfig as ServerConfig,
  ServerState,
  ToolInvocationResponse,
  ToolArguments
} from '@mandrake/utils/src/types/mcp';

// Re-export types for backward compatibility
export type {
  MCPConnection,
  ToolWithServer,
  ServerConfig,
  ServerState,
  ToolInvocationResponse,
  ToolArguments
};