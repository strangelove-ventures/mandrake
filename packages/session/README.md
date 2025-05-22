# Session

## Overview
The Session package is a core component of Mandrake, handling the orchestration of conversation flows between users and AI models, including tool execution. It coordinates the entire lifecycle of a session by connecting workspace configuration, model providers, and MCP (Model Context Protocol) tools to deliver a seamless interactive experience.

## Core Concepts

- **SessionCoordinator**: The central orchestrator that manages conversation flow, including:
  - Building context from workspace configuration
  - Processing user requests
  - Handling model responses
  - Detecting and executing tool calls
  - Managing conversation history
  - Streaming responses in real-time

- **Context Building**: Dynamically assembles the context for each conversation by:
  - Generating a system prompt with workspace configuration
  - Including file contents
  - Adding dynamic context from tool executions
  - Managing conversation history

- **Tool Calling Flow**: Implements a robust tool execution cycle:
  1. Detect tool calls in model responses using XML pattern matching
  2. Execute tool calls through the MCP Manager
  3. Format tool results and errors
  4. Continue the conversation with tool results included

- **Prompt Building**: Uses a modular, section-based approach to assemble system prompts with:
  - Tools definitions
  - File contents
  - Dynamic context results
  - Workspace metadata
  - System information
  - Current date/time

## Architecture

```
Session Package
│
├── SessionCoordinator - Main orchestrator connecting all components
│   │
│   ├── Context Building - Assembles conversation context
│   │
│   ├── Tool Execution - Manages tool calls and responses 
│   │
│   └── Message Processing - Handles streaming responses
│
├── Prompt System - Builds structured system prompts
│   │
│   ├── SystemPromptBuilder - Coordinates prompt assembly
│   │
│   └── Section Modules - Individual prompt components
│       ├── Tools Section
│       ├── Files Section
│       ├── Dynamic Context Section
│       ├── Metadata Section
│       └── System/Date Sections
│
└── Utilities
    ├── Message Conversion - Session/Provider format adapters
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
  async getRoundByResponseId(responseId: string): Promise<{
    round: Round;
    request: Request;
    response: Response;
  }>;
  
  // Builds the context for a conversation
  async buildContext(sessionId: string): Promise<Context>;
  
  // Cleans up resources
  async cleanup(): Promise<void>;
}
```

### Context

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

## Integration Points

- **@mandrake/workspace**: Integrates with workspace configuration, files, and session storage
  - Uses `PromptManager` for system prompt configuration
  - Uses `FilesManager` to include file contents in context
  - Uses `DynamicContextManager` to execute dynamic context tools
  - Uses `SessionManager` to store and retrieve conversation history
  - Uses `ModelsManager` to configure the AI model provider

- **@mandrake/mcp**: Integrates with Model Context Protocol tools
  - Uses `MCPManager` to execute tool calls
  - Handles tool call detection, execution, and result formatting

- **@mandrake/provider**: Interfaces with AI model providers
  - Sets up providers with appropriate configuration
  - Handles message streaming and token usage tracking

- **@mandrake/utils**: Utilizes shared utilities
  - Uses logging infrastructure
  - Uses error handling patterns

## Streaming Support

The session package provides robust streaming support for real-time processing of model responses:

- **Early Response ID Access**: Get the response ID immediately without waiting for processing to complete
- **Async Iteration**: Process updates using standard `for await...of` syntax
- **Turn-by-Turn Updates**: Receive updates as each turn is processed, including tool calls
- **Cleanup Management**: Automatic resource cleanup when streaming is abandoned early
- **Completion Promise**: Track when the entire request has finished processing

For more details, see the [Streaming API documentation](./docs/STREAMING.md).
