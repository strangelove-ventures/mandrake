import { XmlTags, wrapWithXmlTag } from '../types';
import type { PromptSection, ToolsSectionConfig } from '../types';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const TOOL_TAGS = {
  TOOL_CALL: 'tool_call',
  SERVER: 'server',
  METHOD: 'method',
  ARGUMENTS: 'arguments'
} as const;

export class ToolsSection implements PromptSection {
  private readonly toolInstructions = `# Tool Use

You have access to a set of tools that are executed upon the user's approval. You can use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

Each tool is provided by a specific MCP server and is invoked using the \`${TOOL_TAGS.TOOL_CALL}\` XML tag format.

## Required Parameters

- ${TOOL_TAGS.SERVER}: (required) The name of the MCP server providing the tool
- ${TOOL_TAGS.METHOD}: (required) The name of the method to execute on the server
- ${TOOL_TAGS.ARGUMENTS}: (required) A JSON object containing the method's parameters, following its input schema

## Usage Format

<${TOOL_TAGS.TOOL_CALL}>
<${TOOL_TAGS.SERVER}>server</${TOOL_TAGS.SERVER}>
<${TOOL_TAGS.METHOD}>method</${TOOL_TAGS.METHOD}>
<${TOOL_TAGS.ARGUMENTS}>
{
  "param1": "value1",
  "param2": "value2"
}
</${TOOL_TAGS.ARGUMENTS}>
</${TOOL_TAGS.TOOL_CALL}>

## Usage Example

<${TOOL_TAGS.TOOL_CALL}>
<${TOOL_TAGS.SERVER}>github</${TOOL_TAGS.SERVER}>
<${TOOL_TAGS.METHOD}>get_repository</${TOOL_TAGS.METHOD}>
<${TOOL_TAGS.ARGUMENTS}>
{
  "owner": "strangelove-ventures",
  "repo": "mandrake",
  "branch": "main"
}
</${TOOL_TAGS.ARGUMENTS}>
</${TOOL_TAGS.TOOL_CALL}>

## Tool Use Guidelines

1. Use one tool per message and wait for the result before proceeding
2. Tool responses will include:
   - Success or failure status
   - Any error messages or validation failures
   - The tool's output data if successful
3. Never assume a tool call succeeded - always check the response
4. Tool calls may fail due to:
   - Invalid parameters
   - Server errors
   - Network issues
   - Authentication failures
5. If a tool call fails, examine the error and either:
   - Fix the parameters and try again
   - Try an alternative approach using another tool or method
   - Tell the user what steps can be taken to resolve the error if you can't
   - Ask the user for clarification or additional information

# Available Tools`;

  constructor(private readonly config: ToolsSectionConfig) { }

  build(): string {
    if (!this.config.tools || this.config.tools.length === 0) {
      return '';
    }

    // Group tools by server
    const toolsByServer = this.config.tools.reduce((acc, tool) => {
      if (!acc[tool.serverName]) {
        acc[tool.serverName] = [];
      }
      acc[tool.serverName].push(tool);
      return acc;
    }, {} as Record<string, Tool[]>);

    // Format each server's tools
    const toolsContent = Object.entries(toolsByServer)
      .map(([serverName, tools]) => {
        const toolDocs = tools.map(tool =>
          wrapWithXmlTag(XmlTags.TOOL, [
            `Method: ${tool.name}`,
            `Description: ${tool.description}`,
            tool.inputSchema ? `Schema:\n${JSON.stringify(tool.inputSchema, null, 2)}` : ''
          ].filter(Boolean).join('\n'))
        ).join('\n\n');

        return wrapWithXmlTag(XmlTags.SERVER, [
          `name: ${serverName}`,
          'tools:\n' + toolDocs
        ].join('\n'));
      })
      .join('\n\n');

    const instructions = wrapWithXmlTag(XmlTags.TOOL_INSTRUCTIONS, this.toolInstructions);
    return wrapWithXmlTag(XmlTags.TOOLS, instructions + '\n\n' + toolsContent);
  }
}