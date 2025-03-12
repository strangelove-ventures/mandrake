/**
 * Tool calling utilities
 * 
 * This module provides utilities for working with JSON Schema-based tool calling
 * in the Mandrake platform, including parsing, formatting, and type definitions.
 */

// Export all types
export * from './types';

// Export parser functions
export {
  parseToolName,
  extractToolCalls,
  extractToolResults,
  parseToolCall,
  extractParsedToolCalls,
  extractToolCallsForDisplay
} from './parser';

// Export formatter functions
export {
  formatToolCall,
  formatToolResult,
  formatToolError,
  formatToolCallAndResult,
  formatToolCallMarkdown,
  formatToolResultMarkdown
} from './formatter';

// Export converter functions
export {
  toolCallToMCPArguments,
  createToolResultFromMCP,
  toolResultToMCPResponse,
  parsedToolCallToMCPTool,
  mcpToolToParsedToolCall,
  createParsedToolCall
} from './converters';
