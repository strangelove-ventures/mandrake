import { formatToolsOpenAI } from '@mandrake/mcp';
import { Tool } from '@mandrake/types';




export function buildSystemPromptAnthropic() {

}
export function buildSystemPrompt(tools: Tool[]) {
    const toolSchemas = formatToolsOpenAI(tools);

    return `
<output_format>
In this environment you have access to several tools that can help you fulfill user requests.
When you need to use a tool, you must return a single JSON object with EXACTLY this format:

{
  "content": [
    {
      "type": "text",
      "text": "I'm going to use the write_file tool to create a new file.\\nThe file will contain some example content.\\nLet me do that for you now."
    },
    {
      "type": "tool_use",
      "name": "write_file",
      "input": {
        "path": "example.txt",
        "content": "Hello\\nWorld"
      }
    }
  ]
}
</output_format>

Important format notes:
- Line breaks in text and content must use "\\n" not actual line breaks
- The entire response must be a single valid JSON object
- Always include both explanatory text and the tool use
- Strings must use double quotes, not single quotes

After receiving the tool's response, continue by:
1. Acknowledging the tool's response
2. Explaining what happened
3. Using another tool if needed, or completing the task

Available tools:
${JSON.stringify(toolSchemas, null, 2)}

Remember:
- Never use markdown code blocks or language tags around the JSON
- Each tool call must be preceded by explanatory text
- Wait for each tool's response before proceeding
`;
}
