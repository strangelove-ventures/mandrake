import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { 
  Logger 
} from '@mandrake/utils';
import { 
  MCPManager 
} from '@mandrake/mcp';
import type { 
  Message 
} from '@mandrake/provider'
import { 
  PromptManager, 
  FilesManager, 
  DynamicContextManager, 
  SessionManager,
  ModelsManager,
  type PromptConfig, 
  type FileInfo,
} from "@mandrake/workspace"

export interface Context {
  systemPrompt: string;
  history: Message[];
}

export interface SessionMetadata {
  name: string;
  path: string;
}

export interface SessionCoordinatorOptions {
  logger?: Logger;
  metadata: SessionMetadata;
  promptManager: PromptManager;
  sessionManager: SessionManager;
  mcpManager: MCPManager;
  modelsManager: ModelsManager;
  filesManager?: FilesManager;
  dynamicContextManager?: DynamicContextManager;
}