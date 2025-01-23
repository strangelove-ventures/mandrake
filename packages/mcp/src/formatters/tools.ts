import { Tool } from '@mandrake/types';

/**
 * Format tools for OpenAI's function calling format
 */
export function formatToolsOpenAI(tools: Tool[]) {
  return tools.map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: tool.inputSchema.properties,
        required: tool.inputSchema.required || []
      }
    }
  }));
}

/**
 * Format tools for Claude's tool use format
 */
export function formatToolsClaude(tools: Tool[]) {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema
  }));
}
