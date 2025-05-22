# Tools Package Documentation

## Overview

The tools package provides utilities for handling tool calls and tool results in the Mandrake AI agent platform. It enables structured communication between LLMs and backend services through a standardized format.

## Tool Call Format

Tool calls use a simplified JSON format:

```json
{
  "name": "server.method",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

Tool results follow a similar format:

```json
{
  "name": "server.method",
  "content": { /* result data */ }
}
```

Error responses use:

```json
{
  "name": "server.method",
  "error": "Error message details"
}
```

## Core Components

### Types

- `ToolCall`: Represents a request from an LLM to call a tool
- `ToolResult`: Represents the result of a tool execution
- `ParsedToolCall`: Internal representation with server and method names separated
- `ToolCallDisplay`: Frontend-friendly representation for UI display

### Parser Utilities

- `extractToolCalls(text)`: Extracts tool calls from text content
- `extractToolResults(text)`: Extracts tool results from text content
- `parseToolCall(toolCall)`: Parses a tool call into server/method components
- `extractParsedToolCalls(text)`: Extracts and parses tool calls from text
- `extractToolCallsForDisplay(text)`: Formats tool calls and results for UI display

### Formatter Utilities

- `formatToolCall(parsedCall)`: Formats a tool call as JSON
- `formatToolResult(parsedCall, result)`: Formats a successful tool result
- `formatToolError(parsedCall, error)`: Formats an error result
- `formatToolCallAndResult(parsedCall, result, isError)`: Formats both call and result
- `formatToolCallMarkdown(parsedCall)`: Formats a tool call as markdown
- `formatToolResultMarkdown(parsedCall, result, isError)`: Formats a result as markdown

## Error Handling

The package provides specific error types for tool parsing:

- `ToolParsingErrorType.MALFORMED_JSON`: Invalid JSON syntax
- `ToolParsingErrorType.INVALID_TOOL_CALL`: Missing required properties
- `ToolParsingErrorType.INVALID_TOOL_NAME`: Tool name in wrong format
- `ToolParsingErrorType.MISSING_ARGUMENTS`: Arguments not provided

## Usage Examples

### Extracting Tool Calls

```typescript
import { extractToolCalls } from "@mandrake/utils/tools";

const text = `
User requested information, and I'll use a tool to help.

{
  "name": "filesystem.list_files",
  "arguments": {
    "path": "/tmp"
  }
}

The file listing will help us understand what's available.
`;

const toolCalls = extractToolCalls(text);
// Returns an array of tool calls found in the text
```

### Parsing Tool Calls

```typescript
import { parseToolCall } from "@mandrake/utils/tools";

const toolCall = {
  name: "fs.readFile",
  arguments: {
    path: "/path/to/file"
  }
};

const parsed = parseToolCall(toolCall);
// Returns:
// {
//   serverName: "fs",
//   methodName: "readFile",
//   arguments: { path: "/path/to/file" },
//   fullName: "fs.readFile"
// }
```

### Formatting Tool Results

```typescript
import { formatToolResult } from "@mandrake/utils/tools";

const parsedCall = {
  serverName: "fs",
  methodName: "readFile",
  arguments: { path: "/path/to/file" },
  fullName: "fs.readFile"
};

const result = "File content here";

const formatted = formatToolResult(parsedCall, result);
// Returns:
// {
//   "name": "fs.readFile",
//   "content": "File content here"
// }
```

## Design Decisions

### Simplified Format

The tool call format was simplified to remove unnecessary nesting. Previously, tool calls were wrapped in a `tool_calls` array:

```json
{
  "tool_calls": [
    {
      "name": "server.method",
      "arguments": { ... }
    }
  ]
}
```

The current simplified approach has several benefits:

1. **Reduced Complexity**: Fewer layers of nesting make the format more direct
2. **Easier Parsing**: Simpler structure is easier to parse and generate
3. **Better Readability**: More straightforward format for developers to understand
4. **Consistent Structure**: Similar pattern for both requests and responses

### Robust Parsing

The parser uses a balanced brace tracking approach to find valid JSON objects in text:

1. It tracks opening and closing braces to identify potential JSON objects
2. Each potential object is then validated through JSON.parse
3. Objects with the expected structure are included in the results
4. Malformed JSON is gracefully handled by skipping invalid content

This approach is more robust than regex-based alternatives, especially for nested objects.

## Integration with MCP

The tools package is compatible with the Model Context Protocol (MCP) standard:

- `ToolCall` extends MCP's `ToolArguments` interface
- `ToolResult` aligns with MCP's `ToolInvocationResponse`
- Converters are provided for translating between formats

## Testing

The package includes extensive tests for:

- Parsing tool calls and results from text
- Handling valid and malformed JSON
- Converting between different formats
- Ensuring backward compatibility

## Best Practices

1. **Single Tool Calls**: Always make one tool call at a time
2. **Error Handling**: Check for and handle error responses
3. **Name Format**: Use the "server.method" format for tool names
4. **Validation**: Ensure arguments match expected schemas
5. **Tool Results**: Always provide a content or error field in responses
