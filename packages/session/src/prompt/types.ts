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
export interface ToolsSectionConfig {
  tools: Tool[];
}

export interface MetadataSectionConfig {
  workspaceName: string;
  workspacePath: string;
  // Add other metadata fields as needed
}

export interface SystemInfoSectionConfig {
  os: string;
  arch: string;
  // Add other system info fields as needed
}

export interface DateSectionConfig {
  includeTime?: boolean;
}

// XML Tag types
export enum XmlTags {
  INSTRUCTIONS = 'instructions',
  TOOLS = 'tools',
  TOOL = 'tool',
  WORKSPACE = 'workspace',
  SYSTEM = 'system',
  DATETIME = 'datetime'
}

// XML Utility functions
export function wrapWithXmlTag(tag: XmlTags, content: string): string {
  return `<${tag}>\n${content}\n</${tag}>`;
}
