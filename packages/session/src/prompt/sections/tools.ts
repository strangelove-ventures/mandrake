import { XmlTags, wrapWithXmlTag } from '../types';
import type { PromptSection, ToolsSectionConfig } from '../types';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export class ToolsSection implements PromptSection {
  private readonly toolInstructions = `# Tool Use

Each tool is provided by a specific MCP server and is invoked using the \`tool_call\` XML tag format.

## Required Parameters

- server_name: (required) The name of the MCP server providing the tool
- method_name: (required) The name of the method to execute on the server
- arguments: (required) A JSON object containing the method's parameters, following its input schema

## Usage Format

<tool_call>
<server_name>server_name</server_name>
<method_name>method_name</method_name>
<arguments>
{
  "param1": "value1",
  "param2": "value2"
}
</arguments>
</tool_call>

## Usage Example

<tool_call>
<server_name>github</server_name>
<method_name>get_repository</method_name>
<arguments>
{
  "owner": "strangelove-ventures",
  "repo": "mandrake",
  "branch": "main"
}
</arguments>
</tool_call>

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