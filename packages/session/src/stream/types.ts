// Core stream types for provider package
export type ProviderStream = AsyncGenerator<ProviderStreamChunk>;

export type ProviderStreamChunk = 
  | ProviderStreamTextChunk 
  | ProviderStreamToolChunk 
  | ProviderStreamUsageChunk;

export interface ProviderStreamTextChunk {
  type: 'text';
  text: string;
}

export interface ProviderStreamToolChunk {
  type: 'tool';
  name: string;
  params: Record<string, string>;
}

export interface ProviderStreamUsageChunk {
  type: 'usage';
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
}

// Tool related types
export const TOOL_NAMES = [
  'execute_command',
  'read_file',
  'write_to_file',
  'replace_in_file',
  'search_files',
  'list_files',
  'list_code_definition_names',
  'use_mcp_tool',
  'access_mcp_resource',
  'ask_followup_question',
  'attempt_completion',
] as const;

export type ToolName = typeof TOOL_NAMES[number];

export const PARAM_NAMES = [
  'command',
  'requires_approval',
  'path',
  'content',
  'diff',
  'regex',
  'file_pattern',
  'recursive',
  'server_name',
  'tool_name',
  'arguments',
  'uri',
  'question',
  'result',
] as const;

export type ParamName = typeof PARAM_NAMES[number];

// Parser types for processing LLM output
export interface ParsedBlock {
  type: 'text' | 'tool';
  content?: string;
  toolName?: ToolName;
  toolParams?: Record<string, string>;
  partial: boolean;
}