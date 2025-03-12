import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Format content with a markdown section heading
 * @param title The section title
 * @param content The section content
 * @param level The heading level (default: 2 for ##)
 * @returns Formatted markdown section
 */
export function formatMarkdownSection(title: SectionTitles, content: string, level: number = 2): string {
  const heading = '#'.repeat(level);
  return `${heading} ${title}\n\n${content}`;
}

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

// Section titles for markdown formatting
export enum SectionTitles {
  INSTRUCTIONS = 'Instructions',
  TOOLS = 'Tools',
  FILES = 'Files',
  DYNAMIC_CONTEXTS = 'Dynamic Context',
  WORKSPACE = 'Workspace',
  SYSTEM = 'System Information',
  DATETIME = 'Current Date and Time'
}