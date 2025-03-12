# JSON Schema Tool Calling Refactor Plan - Updated

## Implementation Status

### Phase 1: Core Utilities Package ✅

- Created a comprehensive tools utilities package with clean separation between:
  - Type definitions (types.ts)
  - Parsing utilities (parser.ts)
  - Formatting utilities (formatter.ts)
  - MCP conversion utilities (converters.ts)
- Established type compatibility with MCP tool types
- Implemented comprehensive test suite for all components

## Next Steps

### Phase 2: Coordinator and Prompt Generation

1. **Update Prompt Generation**
   - Modify the system prompt section for tools in `/packages/session/src/prompt/sections/tools.ts`
   - Replace XML-based instructions with JSON Schema format
   - Update examples to show the new tool calling format
   - Add clear guidelines for how to structure tool calls and handle responses

2. **Refactor Session Coordinator**
   - Update the coordinator in `/packages/session/src/coordinator.ts` to:
     - Use the new parsing utilities to extract tool calls
     - Process JSON Schema tool calls instead of XML
     - Return tool results in the new JSON format
     - Handle errors consistently with the new approach
   - Add compatibility tests to ensure the coordinator works with all LLM providers

3. **Update Message Rendering**
   - Modify message rendering in `/packages/session/src/utils/messages.ts` to:
     - Use the new formatter utilities for tool calls and results
     - Ensure consistent JSON structure for history messages
     - Support both tool calls and results in the same format
   - Add tests for all message rendering functionality

### Phase 3: Frontend Integration

1. **Update Message Display Components**
   - Create components for tool call visualization in `/web/src/components/shared/chat/`
   - Use the new parsing utilities to extract and display tool calls
   - Add proper styling for tool calls, results, and errors
   - Implement collapsible/expandable sections for complex tool calls

2. **Update Chat Input Integration**
   - Ensure chat input properly handles and displays the new JSON tool calls
   - Add support for displaying running tool calls (with loading indicators)
   - Implement proper error handling and display for failed tool calls

3. **Testing and Validation**
   - Test with multiple LLM providers (Claude, GPT, Gemma, etc.)
   - Verify frontend visualization works correctly
   - Test with various tool types and argument patterns
   - Ensure backward compatibility where needed

## Implementation Details

### JSON Schema Format

Tools will be called using this format:

```json
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
```

Tool responses will follow this format:

```json
{
  "tool_results": [
    {
      "name": "server.method",
      "content": { /* result data */ }
    }
  ]
}
```

Error responses will use:

```json
{
  "tool_results": [
    {
      "name": "server.method",
      "error": "Error message"
    }
  ]
}
```

### Integration with MCP

The implementation includes conversion utilities between JSON Schema format and MCP:

- `toolCallToMCPArguments`: Convert a tool call to MCP arguments
- `createToolResultFromMCP`: Create a tool result from an MCP response
- `toolResultToMCPResponse`: Convert a tool result to an MCP response
- `parsedToolCallToMCPTool`: Convert a parsed tool call to an MCP tool
- `mcpToolToParsedToolCall`: Convert an MCP tool to a parsed tool call
- `createParsedToolCall`: Create a parsed tool call from a tool call

These utilities enable seamless integration between the JSON Schema format and the existing MCP infrastructure.

## Key Requirements

1. **Provider Compatibility**
   - All implemented LLM providers must support the JSON Schema tool format
   - For providers that don't natively support JSON Schema, add appropriate prompt guidance

2. **Error Handling**
   - Tool errors should be clearly differentiated from normal responses
   - Error messages should be descriptive and help users understand what went wrong
   - The frontend should display errors in a user-friendly way

3. **Performance**
   - Tool parsing should be efficient and not cause noticeable delays
   - Frontend visualization should handle large tool responses smoothly

## Testing Checklist

- [ ] Parse tool calls from various LLM providers correctly
- [ ] Format tool calls and results consistently
- [ ] Convert between JSON Schema and MCP formats
- [ ] Handle error cases gracefully
- [ ] Display tool calls and results clearly in the frontend
- [ ] Support all existing tool types with the new format
- [ ] Maintain compatibility with the existing MCP infrastructure

## Timeline and Dependencies

This refactoring requires coordination between multiple packages:

1. **utils:** Tool utilities (completed)
2. **session:** Prompt generation and coordination
3. **api:** API routes for tools
4. **web:** Frontend visualization

The ideal order is to update:

1. Session package (prompt and coordinator)
2. API package (routes and controllers)
3. Web package (frontend components)

## References

- Current implementation in `packages/session/src/prompt/sections/tools.ts`
- Current implementation in `packages/session/src/coordinator.ts`
- Current implementation in `packages/session/src/utils/messages.ts`
- Type definitions in `packages/utils/src/types/mcp/tools.ts`
- New tool utilities in `packages/utils/src/tools/`
