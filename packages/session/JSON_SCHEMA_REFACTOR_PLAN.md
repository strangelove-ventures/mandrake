# Session Package JSON Schema Tool Calling Refactor Plan

This document outlines the detailed plan for refactoring the Session package to use JSON Schema tool calling instead of the current XML-based approach.

## Background

The Mandrake platform is transitioning from XML-based tool calling to JSON Schema format to align with modern LLM capabilities and improve code modularity. This document focuses specifically on the changes needed in the Session package.

## Overview of Changes

The Session package handles the coordination between the LLM provider and tool execution. Key components that need updating:

1. **Prompt Generation**: Update tool sections in system prompts to use JSON Schema format
2. **Tool Call Extraction**: Replace XML parsing with JSON parsing
3. **Message Rendering**: Update tool call and result formatting
4. **Session History**: Ensure compatibility with the new format

## 1. Update the Tools Section in the Prompt Generator

**File: `/packages/session/src/prompt/sections/tools.ts`**

### Current Approach

- Uses XML tags for tool definitions and examples
- Provides XML-specific formatting for tool calling

### Changes Needed

1. **Update Tool Instructions**:
   - Replace XML format instructions with JSON Schema format
   - Update examples to show the new JSON structure
   - Reference both the request and response format examples

2. **Tool Definition Format**:
   - Replace XML tags with JSON Schema representation
   - Update the example generation to produce JSON Schema examples

3. **Code Implementation**:

```typescript
// New tool instructions using JSON Schema format
private readonly toolInstructions = `# Tool Use

You have access to a set of tools that can be executed. Use tools step-by-step to accomplish tasks.

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

## Tool Use Guidelines
1. Use one tool at a time
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

# Available Tools:`;

// Updated build method
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

  return this.toolInstructions + '\n\n' + toolDocs;
}
```

## 2. Update the Coordinator for JSON Schema Tool Parsing

**File: `/packages/session/src/coordinator.ts`**

### Current Approach

- Extracts XML tool calls using regex and string parsing
- Processes streaming responses looking for XML tags
- Parses tool calls with XML structure expectations

### Changes Needed

1. **Replace XML Extraction with JSON Schema Parsing**:
   - Use `extractToolCalls` from our new parser
   - Check for complete JSON objects instead of XML tags
   - Extract serverName and methodName from the combined "name" field

2. **Update Stream Processing**:
   - Modify how we extract tool calls from streaming responses
   - Use the parser to find complete JSON tool call objects

3. **Specific Methods to Update**:
   - `processStreamForToolCalls`: Check for JSON tool calls, not XML
   - `extractCompleteToolCalls`: Use JSON parser instead of XML regex
   - `parseCompleteToolCall`: Convert to JSON parsing

4. **Code Implementation**:

```typescript
// Add imports from the new tools utilities
import { 
  extractToolCalls, 
  parseToolName, 
  extractToolResults 
} from '@mandrake/utils/tools';

// Updated method to process a message stream and extract tool calls
private async processStreamForToolCalls(
  messageStream: AsyncIterable<any>,
  currentTurn: any
): Promise<{ text: string; toolCalls: any[]; isCompleted: boolean }> {
  let textBuffer = '';
  let jsonBuffer = '';
  let toolCalls = [];
  let isCompleted = false;

  for await (const chunk of messageStream) {
    switch (chunk.type) {
      case 'text':
        textBuffer += chunk.text;
        jsonBuffer += chunk.text;

        await this.opts.sessionManager.updateTurn(currentTurn.id, {
          rawResponse: textBuffer,
          content: textBuffer
        });

        // Look for complete tool calls using our new parser
        const extractedToolCalls = extractToolCalls(jsonBuffer);
        if (extractedToolCalls.length > 0) {
          // If we found tool calls, try to parse them into our internal format
          try {
            const parsedToolCalls = extractedToolCalls.map(call => {
              // Parse the server.method format
              const parsed = parseToolName(call.name);
              if (!parsed) return null;
              
              return {
                serverName: parsed.serverName,
                methodName: parsed.methodName,
                arguments: call.arguments
              };
            }).filter(Boolean);
            
            if (parsedToolCalls.length > 0) {
              toolCalls = parsedToolCalls;
              return { text: textBuffer, toolCalls, isCompleted: false };
            }
          } catch (error) {
            this.logger.error("PARSE_TOOL_CALL_ERROR", error as Error);
          }
        }
        break;

      case 'done':
        isCompleted = true;
        break;

      case 'usage':
        await this.opts.sessionManager.updateTurn(currentTurn.id, {
          inputTokens: chunk.inputTokens,
          outputTokens: chunk.outputTokens,
          inputCost: 0,
          outputCost: 0
        });
        break;
    }
  }

  return { text: textBuffer, toolCalls: [], isCompleted: true };
}

// Remove these XML-specific methods as they will be replaced by the JSON Schema parser
// private extractCompleteToolCalls(content: string)
// private parseCompleteToolCall(xml: string)
```

## 3. Update Message Rendering

**File: `/packages/session/src/utils/messages.ts`**

### Current Approach

- Formats tool calls and results as XML strings
- Embeds XML directly in assistant messages
- Uses separate functions for formatting calls, results, and errors

### Changes Needed

1. **Update Formatting Functions**:
   - Replace XML formatting with JSON Schema format
   - Use the new formatter utilities from utils/tools

2. **Update Conversion Logic**:
   - Modify how tools and responses are embedded in messages
   - Ensure correct JSON Schema format in message history

3. **Code Implementation**:

```typescript
import { 
  formatToolCall, 
  formatToolResult, 
  formatToolError 
} from '@mandrake/utils/tools';

/**
 * Format a tool call into JSON Schema format
 */
export function formatToolCallInMessage(call: any): string {
  const parsedCall = {
    serverName: call.serverName,
    methodName: call.methodName,
    arguments: call.arguments,
    fullName: `${call.serverName}.${call.methodName}`
  };
  
  return formatToolCall(parsedCall);
}

/**
 * Format a tool result into JSON Schema format
 */
export function formatToolResultInMessage(result: any, serverName: string, methodName: string): string {
  return formatToolResult({
    serverName,
    methodName,
    arguments: {}, // Not needed for result
    fullName: `${serverName}.${methodName}`
  }, result);
}

/**
 * Format a tool error into JSON Schema format
 */
export function formatToolErrorInMessage(error: any, serverName: string, methodName: string): string {
  return formatToolError({
    serverName,
    methodName,
    arguments: {}, // Not needed for error
    fullName: `${serverName}.${methodName}`
  }, error);
}
```

## 4. Update Message History Processing

The `convertSessionToMessages` function needs to be updated to work with JSON Schema:

```typescript
// Process response turns and build a single assistant message for the entire round
if (round.response.turns.length > 0) {
  let assistantContent = '';

  for (const turn of round.response.turns) {
    // Add content from turn
    if (turn.content) {
      try {
        // Process content as before...
      } catch (e) {
        console.error('Error parsing turn content:', e);
      }
    }

    // Update tool calls handling to use JSON format
    if (turn.toolCalls) {
      try {
        const toolCallsData = typeof turn.toolCalls === 'string' 
          ? JSON.parse(turn.toolCalls) 
          : turn.toolCalls;
        
        // Handle the case where we have a call and response
        if (toolCallsData.call && toolCallsData.call.serverName && toolCallsData.call.methodName) {
          // Create the full name from server and method
          const fullName = `${toolCallsData.call.serverName}.${toolCallsData.call.methodName}`;
          
          // Create a parsed tool call structure
          const parsedCall = {
            serverName: toolCallsData.call.serverName,
            methodName: toolCallsData.call.methodName,
            arguments: toolCallsData.call.arguments,
            fullName
          };
          
          // Format the tool call in JSON format
          assistantContent += formatToolCallInMessage({
            serverName: toolCallsData.call.serverName,
            methodName: toolCallsData.call.methodName,
            arguments: toolCallsData.call.arguments
          });
          
          // Add the tool result in JSON format
          if (toolCallsData.response) {
            if (toolCallsData.response.error) {
              assistantContent += formatToolErrorInMessage(
                toolCallsData.response.error,
                toolCallsData.call.serverName,
                toolCallsData.call.methodName
              );
            } else {
              assistantContent += formatToolResultInMessage(
                toolCallsData.response,
                toolCallsData.call.serverName,
                toolCallsData.call.methodName
              );
            }
          }
        }
      } catch (e) {
        console.error('Error parsing tool calls:', e);
      }
    }
  }

  if (assistantContent) {
    messages.push({
      role: 'assistant',
      content: assistantContent.trim()
    });
  }
}
```

## 5. Testing and Integration

1. **Create Unit Tests**:
   - Test JSON Schema prompt generation
   - Test tool call extraction from responses
   - Test formatting of messages with tool calls/results

2. **Create Integration Tests**:
   - Verify that full session flow works end-to-end
   - Test with different LLM providers
   - Ensure proper error handling throughout the flow

3. **Common Test Cases**:
   - Single tool call extraction
   - Multiple tool calls in one response
   - Error handling for invalid JSON
   - History rendering with tool calls

## Implementation Approach

1. **Phased Implementation**:
   - Start with updating the prompt generation
   - Then update the coordinator and tool extraction
   - Finally update message rendering
   - Add comprehensive tests at each step

2. **Backward Compatibility**:
   - Consider adding temporary support for both XML and JSON formats
   - Add a flag to toggle between formats if needed during transition
   - Eventually phase out XML support entirely

## Risks and Mitigations

1. **Model Compatibility**:
   - Risk: Some models might not understand JSON Schema format
   - Mitigation: Test with all supported models, add model-specific prompts if needed

2. **Parsing Robustness**:
   - Risk: Models might generate malformed JSON
   - Mitigation: Implement robust error handling and partial parsing

3. **Session History Compatibility**:
   - Risk: Existing session history might be in XML format
   - Mitigation: Add a migration strategy or dual-format support

## Checklist for Success

- [ ] Update tools section in prompt generator
- [ ] Update coordinator's tool extraction logic
- [ ] Update message formatting utilities
- [ ] Update session history conversion
- [ ] Add unit tests for all components
- [ ] Add integration tests for complete flow
- [ ] Test with all supported LLM providers
- [ ] Update documentation and examples

## References

- New utilities package: `/packages/utils/src/tools/`
- Current XML implementation: `/packages/session/src/prompt/sections/tools.ts`
- Coordinator implementation: `/packages/session/src/coordinator.ts`
- Message rendering: `/packages/session/src/utils/messages.ts`
