import { formatMarkdownSection, SectionTitles } from '../types';
import type { PromptSection, ToolsSectionConfig } from '../types';

export class ToolsSection implements PromptSection {
  private readonly toolInstructions = `You have access to a set of tools that can be executed. Use tools one at a time to accomplish tasks. This means you should wait for the user to send back the result of a tool before using another one. The tool call should be the last part of a message you send to the user.

## Usage Format
To use a tool, output a JSON object with the following structure:

{
  "name": "server.method",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}

## IMPORTANT: Make only one tool call at a time
Make a single tool call, then wait for the result before making another call.

## Usage Example

{
  "name": "ripper.list_allowed_directories",
  "arguments": {}
}

## Tool Use Guidelines

1. Use only one tool at a time and wait for the result
2. Always check the response for success or failure
3. Tool responses will be returned in this format:

{
  "name": "server.method",
  "content": { /* result data */ }
}

4. If a tool call results in an error, it will be returned as:

{
  "name": "server.method",
  "error": "Error message details"
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

## Using JSON Schema
Each tool below includes its JSON schema that describes required parameters and their types.
Key elements to understand in these schemas:

1. \`required\`: Lists parameters that must be provided
2. \`properties\`: Describes each parameter with its:
   - \`type\`: string, number, boolean, array, object, etc.
   - \`description\`: Explains what the parameter does
   - \`format\`: For strings, may specify patterns like "uri", "date-time", etc.
   - Additional constraints like \`minimum\`, \`maxLength\`, etc.

## Available Tools:`;

  constructor(private readonly config: ToolsSectionConfig) { }

  build(): string {
    if (!this.config.tools || this.config.tools.length === 0) {
      return '';
    }

    // Generate tool documentation with JSON schema
    const toolDocs = this.config.tools.map(tool => {
      return `## ${tool.serverName}.${tool.name}
Description: ${tool.description || ''}

Schema:
\`\`\`json
${JSON.stringify(tool.inputSchema, (key, value) => {
  if (key === "additionalProperties" || key === "$schema") {
    return undefined;
  }
  return value;
}, 2)}
\`\`\``;
    }).join('\n\n');

    return formatMarkdownSection(SectionTitles.TOOLS, `${this.toolInstructions}\n\n${toolDocs}`, 1);
  }

  // Method removed as we now use the actual JSON schema directly

}