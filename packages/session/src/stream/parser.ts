import { TOOL_NAMES, PARAM_NAMES } from './types';
import type { ParsedBlock, ToolName, ParamName } from './types';

export function parseProviderMessage(message: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let currentText: { content: string, start: number } | undefined;
  let currentTool: { name: ToolName, start: number, params: Record<string, string> } | undefined;
  let currentParam: { name: ParamName, start: number } | undefined;
  let accumulator = '';

  for (let i = 0; i < message.length; i++) {
    const char = message[i];
    accumulator += char;

    // Handle parameter values if we're in a tool with a current param
    if (currentTool && currentParam) {
      const paramValue = accumulator.slice(currentParam.start);
      const paramCloseTag = `</${currentParam.name}>`;
      
      if (paramValue.endsWith(paramCloseTag)) {
        // Store param value and clear current param
        currentTool.params[currentParam.name] = paramValue
          .slice(0, -paramCloseTag.length)
          .trim();
        currentParam = undefined;
        continue;
      }
      continue; // Still accumulating param value
    }

    // Handle tool content when we have a tool but no current param
    if (currentTool) {
      const toolContent = accumulator.slice(currentTool.start);
      const toolCloseTag = `</${currentTool.name}>`;

      if (toolContent.endsWith(toolCloseTag)) {
        // Push completed tool and reset
        blocks.push({
          type: 'tool',
          toolName: currentTool.name,
          toolParams: currentTool.params,
          partial: false
        });
        currentTool = undefined;
        continue;
      }

      // Check for start of a new parameter
      const paramMatch = PARAM_NAMES.find(name => 
        accumulator.endsWith(`<${name}>`)
      );
      
      if (paramMatch) {
        currentParam = {
          name: paramMatch,
          start: accumulator.length
        };
        continue;
      }

      // Special handling for write_to_file content parameter
      if (currentTool.name === 'write_to_file' && accumulator.endsWith('</content>')) {
        const contentTag = '<content>';
        const contentCloseTag = '</content>';
        const content = toolContent;
        const contentStart = content.indexOf(contentTag) + contentTag.length;
        const contentEnd = content.lastIndexOf(contentCloseTag);
        
        if (contentStart !== -1 && contentEnd !== -1 && contentEnd > contentStart) {
          currentTool.params['content'] = content
            .slice(contentStart, contentEnd)
            .trim();
        }
      }
      
      continue; // Still in tool content
    }

    // Check for start of a new tool
    const toolMatch = TOOL_NAMES.find(name =>
      accumulator.endsWith(`<${name}>`)
    );

    if (toolMatch) {
      // Handle any accumulated text before the tool
      if (currentText) {
        const textContent = accumulator
          .slice(currentText.start, -(toolMatch.length + 2))
          .trim();
        
        if (textContent) {
          blocks.push({
            type: 'text',
            content: textContent,
            partial: false
          });
        }
        currentText = undefined;
      }

      currentTool = {
        name: toolMatch,
        start: accumulator.length,
        params: {}
      };
      continue;
    }

    // If we're not in a tool or param, treat as text
    if (!currentText) {
      currentText = { content: char, start: i };
    }
  }

  // Handle any partial state at end of input
  if (currentTool) {
    // If we have a partial parameter, save its value
    if (currentParam) {
      currentTool.params[currentParam.name] = accumulator
        .slice(currentParam.start)
        .trim();
    }
    
    blocks.push({
      type: 'tool',
      toolName: currentTool.name,
      toolParams: currentTool.params,
      partial: true
    });
  } else if (currentText) {
    blocks.push({
      type: 'text', 
      content: accumulator.slice(currentText.start).trim(),
      partial: true
    });
  }

  return blocks;
}