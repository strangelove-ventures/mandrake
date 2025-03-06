import { XmlTags, wrapWithXmlTag } from '../types';
import type { PromptSection, ToolsSectionConfig } from '../types';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export class ToolsSection implements PromptSection {
  private readonly toolInstructions = `# Tool Use

You have access to a set of tools that can be executed upon the user's approval. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

## Usage Format

<${XmlTags.TOOL_CALL}>
<${XmlTags.SERVER}>server</${XmlTags.SERVER}>
<${XmlTags.METHOD}>method</${XmlTags.METHOD}>
<${XmlTags.ARGUMENTS}>
{
  "param1": "value1",
  "param2": "value2"
}
</${XmlTags.ARGUMENTS}>
</${XmlTags.TOOL_CALL}>

## Usage Example

<${XmlTags.TOOL_CALL}>
<${XmlTags.SERVER}>ripper</${XmlTags.SERVER}>
<${XmlTags.METHOD}>list_allowed_directories</${XmlTags.METHOD}>
<${XmlTags.ARGUMENTS}>
{}
</${XmlTags.ARGUMENTS}>
</${XmlTags.TOOL_CALL}>

## Tool Use Guidelines

1. Use one tool per message. The user will parse the result and call the tool
   then they will append the result to the end of the assistant message. You should 
   read result out of that and conitnue the conversation.
2. The tool call format is as shown above, it is XML based. 
3. Tool responses will include:
   - Success or failure status
   - Any error messages or validation failures
   - The tool's output data if successful
4. Never assume a tool call succeeded - always check the response
5. Tool calls may fail due to:
   - Invalid parameters
   - Server errors
   - Network issues
   - Authentication failures
6. If a tool call fails, examine the error and either:
   - Fix the parameters and try again
   - Try an alternative approach using another tool or method
   - Tell the user what steps can be taken to resolve the error if you can't
   - Ask the user for clarification or additional information

# Available Tools:`;

  constructor(private readonly config: ToolsSectionConfig) { }

  build(): string {
    if (!this.config.tools || this.config.tools.length === 0) {
      return '';
    }

    const toolDocs = this.config.tools.map(tool => {
      const exampleArgs = this.createExampleArgs(tool.inputSchema);

      return wrapWithXmlTag(XmlTags.TOOL_CALL, [
        wrapWithXmlTag(XmlTags.SERVER, tool.serverName, true),
        wrapWithXmlTag(XmlTags.METHOD, tool.name, true),
        wrapWithXmlTag(XmlTags.DESCRIPTION, tool.description as string, true),
        // Schema commented out for now
        // wrapWithXmlTag(XmlTags.SCHEMA, JSON.stringify(tool.inputSchema, null, 2), true),
        wrapWithXmlTag(XmlTags.ARGUMENTS, JSON.stringify(exampleArgs, null, 2))
      ].join('\n'));
    }).join('\n\n');

    const instructions = wrapWithXmlTag(XmlTags.TOOL_INSTRUCTIONS, this.toolInstructions);
    return wrapWithXmlTag(XmlTags.TOOLS, instructions + '\n\n' + toolDocs);
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