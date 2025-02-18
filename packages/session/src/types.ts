import type { Logger } from '@mandrake/utils';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MCPManager } from '@mandrake/mcp';
import { 
  PromptManager, 
  FilesManager, 
  DynamicContextManager, 
  SessionManager,
  ModelsManager,
} from "@mandrake/workspace"
import type { 
  PromptConfig, 
  FileInfo,
  Session,
} from '@mandrake/workspace';

export interface Context {
  systemPrompt: PromptConfig;
  tools: Tool[];
  files: FileInfo[];
  dynamicContext: CallToolResult[];
  history: Session[];
}

export interface SessionCoordinatorOptions {
  logger?: Logger;
  promptManager: PromptManager;
  sessionManager: SessionManager;
  mcpManager: MCPManager;
  modelsManager: ModelsManager;
  filesManager?: FilesManager;
  dynamicContextManager?: DynamicContextManager;
}

export interface MessageOptions {
  sessionId: string;
  request: string;
}