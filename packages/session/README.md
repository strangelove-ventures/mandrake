# Session

## Overview

The Session package orchestrates conversation flows between users and AI models, including tool execution. It manages the complete lifecycle of a session by assembling context, processing requests, handling responses, detecting and executing tool calls, and maintaining conversation history.

## Core Concepts

### SessionCoordinator

The central orchestrator that manages conversation flow, including:

- Building context from configuration
- Processing user requests
- Handling model responses
- Detecting and executing tool calls
- Managing conversation history
- Streaming responses in real-time

### Context Building

Dynamically assembles the context for each conversation by:

- Generating a system prompt
- Including file contents
- Adding dynamic context from tool executions
- Managing conversation history

### Tool Calling Flow

Implements a robust tool execution cycle:

1. Detect tool calls in model responses using XML pattern matching
2. Execute tool calls through external handlers
3. Format tool results and errors
4. Continue the conversation with tool results included

### Prompt Building

Uses a modular, section-based approach to assemble system prompts with:

- Tools definitions
- File contents
- Dynamic context results
- Metadata
- System information
- Current date/time

## Architecture

```
Session Package
│
├── SessionCoordinator - Main orchestrator
│   ├── Context Building - Assembles conversation context
│   ├── Tool Execution - Manages tool calls and responses 
│   └── Message Processing - Handles streaming responses
│
├── Prompt System - Builds structured system prompts
│   ├── SystemPromptBuilder - Coordinates prompt assembly
│   └── Section Modules - Individual prompt components
│       ├── Tools Section
│       ├── Files Section
│       ├── Dynamic Context Section
│       ├── Metadata Section
│       └── System/Date Sections
│
└── Utilities
    ├── Message Conversion - Format adapters
    ├── Provider Setup - Model configuration
    └── Error Handling - Specialized error types
```

## Usage

```typescript
import { SessionCoordinator } from '@mandrake/session';
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';

// Initialize workspace
const workspace = new WorkspaceManager('/path/to/workspace', 'my-workspace');
await workspace.init('My Project Workspace');

// Configure model provider
await workspace.models.updateProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Start MCP servers
const mcpManager = new MCPManager();
await mcpManager.startServer("filesystem",{
  command: 'docker',
  args: [
    'run',
    '--rm',
    '-i',
    '--mount',
    `type=bind,src=${workspacePath},dst=/workspace`,
    'mcp/filesystem',
    '/workspace'
  ]
});

// Create session coordinator
const coordinator = new SessionCoordinator({
  metadata: {
    name: 'my-workspace',
    path: workspace.paths.root
  },
  promptManager: workspace.prompt,
  sessionManager: workspace.sessions,
  mcpManager,
  modelsManager: workspace.models,
  filesManager: workspace.files,
  dynamicContextManager: workspace.dynamic
});

// Create a session
const session = await workspace.sessions.createSession({
  title: 'New Project Session'
});

// Basic usage - returns response ID and completion promise
const { responseId, completionPromise } = await coordinator.handleRequest(
  session.id,
  'Create a new React component that displays a counter'
);

// Wait for completion if needed
await completionPromise;

// Streaming usage
const { stream, completionPromise: streamingPromise } = await coordinator.streamRequest(
  session.id,
  'Update the component to include a reset button'
);

// Process streaming updates in real-time
for await (const turn of stream) {
  console.log("Turn update:", turn.content);
  
  // Access tool calls if present
  if (turn.parsedToolCalls?.call) {
    console.log("Tool call:", turn.parsedToolCalls.call);
  }
}

// Access session history
const history = await workspace.sessions.renderSessionHistory(session.id);
console.log(history.rounds[0].response.turns);

// Cleanup when done
await mcpManager.cleanup();
```

## Key Interfaces

### SessionCoordinator

```typescript
interface SessionCoordinatorOptions {
  logger?: Logger;
  metadata: SessionMetadata;
  promptManager: PromptManager;
  sessionManager: SessionManager;
  mcpManager: MCPManager;
  modelsManager: ModelsManager;
  filesManager?: FilesManager;
  dynamicContextManager?: DynamicContextManager;
}

class SessionCoordinator {
  constructor(options: SessionCoordinatorOptions);
  
  // Process a user request and return responseId with completion promise
  async handleRequest(sessionId: string, requestContent: string): Promise<{
    responseId: string;
    completionPromise: Promise<void>;
  }>;
  
  // Process a request with streaming interface
  async streamRequest(sessionId: string, requestContent: string): Promise<{
    responseId: string;
    stream: AsyncIterable<Turn>;
    completionPromise: Promise<void>;
  }>;
  
  // Get round data by response ID
  async getRoundByResponseId(responseId: string): Promise<RoundData>;
  
  // Builds the context for a conversation
  async buildContext(sessionId: string): Promise<Context>;
  
  // Cleans up resources
  async cleanup(): Promise<void>;
}
```

### Context Interface

```typescript
interface Context {
  systemPrompt: string;  // Full system prompt with all context
  history: Message[];    // Conversation history
}
```

### SystemPromptBuilder

```typescript
interface SystemPromptBuilderConfig {
  instructions: string;
  tools?: ToolsSectionConfig;
  metadata?: MetadataSectionConfig;
  systemInfo?: SystemInfoSectionConfig;
  dateConfig?: DateSectionConfig;
  files?: FilesSectionConfig;
  dynamicContext?: DynamicContextSectionConfig;
}

class SystemPromptBuilder {
  constructor(config: SystemPromptBuilderConfig);
  buildPrompt(): string;
}
```

## Usage Examples

### Basic Request Handling

```typescript
import { SessionCoordinator } from '@mandrake/session';

// Create coordinator with required dependencies
const coordinator = new SessionCoordinator({
  metadata: {
    name: 'my-workspace',
    path: '/path/to/workspace'
  },
  promptManager,
  sessionManager,
  mcpManager,
  modelsManager,
  filesManager,
  dynamicContextManager
});

// Create a session
const session = await sessionManager.createSession({
  title: 'Development Session'
});

// Handle a request
const { responseId, completionPromise } = await coordinator.handleRequest(
  session.id,
  'Create a new React component for a user profile'
);

// Wait for completion
await completionPromise;

// Get the complete round data
const roundData = await coordinator.getRoundByResponseId(responseId);
console.log('Response:', roundData.response.turns);
```

### Streaming Responses

```typescript
// Stream a request
const { responseId, stream, completionPromise } = await coordinator.streamRequest(
  session.id,
  'Add validation to the user profile component'
);

// Process streaming updates
for await (const turn of stream) {
  // Handle text content
  console.log('Content:', turn.content);
  
  // Check for tool calls
  if (turn.parsedToolCalls?.call) {
    console.log('Tool call:', turn.parsedToolCalls.call);
  }
  
  // Monitor status
  if (turn.status === 'completed') {
    console.log('Turn completed');
  }
}

// Ensure everything is done
await completionPromise;
```

### Building Context

```typescript
// Build context for a session
const context = await coordinator.buildContext(session.id);

console.log('System prompt:', context.systemPrompt);
console.log('History messages:', context.history.length);
```

## Tool Calling

The session package detects and manages tool calls in model responses:

```typescript
// Tool calls are automatically detected in model responses
// Format: <tool_call>{"tool": "name", "parameters": {...}}</tool_call>

// Tool results are formatted and included in the conversation
// The coordinator continues the conversation after tool execution
```

## Prompt Building

System prompts are built using a modular approach:

```typescript
const builder = new SystemPromptBuilder({
  instructions: 'You are a helpful coding assistant.',
  tools: {
    tools: availableTools,
    formatInstructions: true
  },
  files: {
    files: contextFiles,
    header: 'Project files:'
  },
  metadata: {
    name: 'my-project',
    description: 'A React application'
  },
  systemInfo: {
    includeOSInfo: true,
    includeTechStack: true
  }
});

const systemPrompt = builder.buildPrompt();
```

## Error Handling

The package provides specific error types:

- `SessionNotFoundError`: Session doesn't exist
- `ProviderError`: Model provider issues
- `ToolExecutionError`: Tool call failures
- `ContextBuildError`: Context assembly errors

## Streaming Features

- **Early Response ID**: Get response ID immediately without waiting
- **Async Iteration**: Process updates using `for await...of`
- **Turn Updates**: Receive incremental content and tool calls
- **Resource Cleanup**: Automatic cleanup when streaming stops
- **Completion Tracking**: Promise to track full completion

## Message Conversion

The package handles conversion between different message formats:

- Session format (with turns and tool calls)
- Provider format (simple role/content)
- Streaming chunks to turns
- Tool call parsing and formatting
