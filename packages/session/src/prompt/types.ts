import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface PromptBuilder {
  buildPrompt(): string;
}

// Base section type
export interface PromptSection {
  build(): string;
}

export interface ContextSection extends PromptSection {
  getContextString(): string;
}

// Section config types
export interface ToolWithServer extends Tool {
  serverName: string;
}

export interface ToolsSectionConfig {
  tools: ToolWithServer[];
}

export interface MetadataSectionConfig {
  workspaceName: string;
  workspacePath: string;
  // Add other metadata fields as needed
}

export interface SystemInfoSectionConfig {
  os: string;
  arch: string;
  cwd?: string;
  // Add other system info fields as needed
}

export interface DateSectionConfig {
  includeTime?: boolean;
}

export interface FilesSectionConfig {
  files: {
    name: string;
    content: string;
  }[];
}

export interface DynamicContextSectionConfig {
  dynamicContext: {
    name: string;
    result: any;
  }[];
}

// XML Tag types
export enum XmlTags {
  INSTRUCTIONS = 'instructions',
  TOOLS = 'tools',
  TOOL = 'tool',
  SERVER = 'server',
  TOOL_INSTRUCTIONS = 'tool_instructions',
  FILES = 'files',
  FILE = 'file',
  DYNAMIC_CONTEXTS = 'dynamic_contexts',
  DYNAMIC_CONTEXT = 'dynamic_context',
  WORKSPACE = 'workspace',
  SYSTEM = 'system',
  DATETIME = 'datetime'
}

// XML Utility functions
export function wrapWithXmlTag(tag: XmlTags, content: string): string {
  return `<${tag}>\n${content}\n</${tag}>`;
}
