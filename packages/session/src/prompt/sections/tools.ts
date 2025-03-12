import { formatMarkdownSection, SectionTitles } from '../types';
import type { PromptSection, ToolsSectionConfig } from '../types';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export class ToolsSection implements PromptSection {
  private readonly toolInstructions = `You have access to a set of tools that can be executed. Use tools one at a time to accomplish tasks.

## Usage Format
To use a tool, output a JSON object with the following structure:

{
  "tool_calls": [
    {
      "name": "server.method",
      "arguments": {
        "param1": "value1",
        "param2": "value2"
      }
    }
  ]
}

## IMPORTANT: Only include ONE tool call at a time
Make only a single tool call, then wait for the result before making another call. Never include multiple tools in the array.

## Usage Example

{
  "tool_calls": [
    {
      "name": "ripper.list_allowed_directories",
      "arguments": {}
    }
  ]
}

## Tool Use Guidelines

1. Use only one tool at a time and wait for the result
2. Always check the response for success or failure
3. Tool responses will be returned in this format:

{
  "tool_results": [
    {
      "name": "server.method",
      "content": { /* result data */ }
    }
  ]
}

4. If a tool call results in an error, it will be returned as:

{
  "tool_results": [
    {
      "name": "server.method",
      "error": "Error message details"
    }
  ]
}

5. Never assume a tool call succeeded - always check the response
6. Tool calls may fail due to:
   - Invalid parameters
   - Server errors
   - Network issues
   - Authentication failures
7. If a tool call fails, examine the error and either:
   - Fix the parameters and try again
   - Try an alternative approach using another tool or method
   - Tell the user what steps can be taken to resolve the error
   - Ask the user for clarification or additional information

## Available Tools:`;

  constructor(private readonly config: ToolsSectionConfig) { }

  build(): string {
    if (!this.config.tools || this.config.tools.length === 0) {
      return '';
    }

    // Generate tool documentation in JSON format
    const toolDocs = this.config.tools.map(tool => {
      const exampleArgs = this.createExampleArgs(tool.inputSchema);
      
      return `## ${tool.serverName}.${tool.name}
Description: ${tool.description || ''}

Example:
\`\`\`json
{
  "tool_calls": [
    {
      "name": "${tool.serverName}.${tool.name}",
      "arguments": ${JSON.stringify(exampleArgs, null, 2)}
    }
  ]
}
\`\`\``;
    }).join('\n\n');

    return formatMarkdownSection(SectionTitles.TOOLS, `${this.toolInstructions}\n\n${toolDocs}`, 1);
  }

  private createExampleArgs(schema: any): any {
    if (!schema || !schema.properties) return {};

    const example: Record<string, any> = {};

    for (const [key, prop] of Object.entries<any>(schema.properties)) {
      switch (prop.type) {
        case 'string':
          example[key] = `example_${key}`;
          break;
        case 'array':
          if (prop.items?.type === 'string') {
            example[key] = [`first_${key}`, `second_${key}`];
          } else {
            example[key] = [];
          }
          break;
        case 'number':
        case 'integer':
          example[key] = 42;
          break;
        case 'boolean':
          example[key] = false;
          break;
        case 'object':
          example[key] = this.createExampleArgs(prop);
          break;
        default:
          example[key] = null;
      }
    }

    return example;
  }

}