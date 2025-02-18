# Session Package Implementation Plan

## Overview

The session package coordinates between workspace, MCP, and provider packages to enable complete conversations with tool usage. Key responsibilities:

- Building system prompts from configuration
- Managing context assembly (files, dynamic content)
- Orchestrating provider interactions and tool calls
- Updating session storage with results

## Core Interfaces

### SessionCoordinator

```typescript
interface SessionCoordinator {
  constructor(opts: {
    promptManager: PromptManager;
    sessionManager: SessionManager; 
    mcpManager: MCPManager;
    modelsManager: ModelsManager;
    filesManager?: FilesManager;
    dynamicContextManager?: DynamicContextManager;
  });

  // Main entry point - handles single message
  handleMessage(opts: {
    sessionId: string;
    request: string;
  }): Promise<void>;

  // Internal methods
  private buildContext(): Promise<Context>;
  private processResponse(sessionId: string, response: ProviderResponse): void;
  private handleToolCall(sessionId: string, toolCall: ToolCall): Promise<void>;
}

// Built fresh for each message
interface Context {
  systemPrompt: string;           // From prompt builder
  files: Array<{                  // From files manager 
    name: string;
    content: string;
  }>;
  dynamicContext: ToolResponse[]; // From dynamic context manager
  history: Session[];            // From session manager
}

// Used to configure system prompt
interface SystemPrompt {
  instructions: string;              // User supplied instructions
  tools: Tool[];                     // Tool list from MCP
  includeWorkspaceMetadata: boolean; // Workspace directory, etc.
  includeSystemInfo: boolean;        // System details, etc.
  includeDateTime: boolean;          // Current date/time
}

// Error types
class SessionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
  }
}

class ContextBuildError extends SessionError {}
class MessageProcessError extends SessionError {}
class ToolCallError extends SessionError {}
```

## Implementation Details

### File Structure

```sh
session/
├── src/
│   ├── index.ts             - Package exports
│   ├── coordinator.ts       - Main SessionCoordinator implementation
│   ├── context.ts          - Context building logic
│   ├── prompt/
│   │   ├── index.ts         - Main prompt builder
│   │   ├── tools.ts         - Tool section builder
│   │   ├── metadata.ts      - Workspace metadata builder
│   │   ├── system.ts        - System info builder 
│   │   └── date.ts          - Date/time builder
│   ├── errors.ts           - Custom error types
│   └── types.ts            - Shared type definitions
├── tests/
│   ├── coordinator.test.ts  - Core coordinator tests
│   ├── context.test.ts     - Context building tests
│   ├── prompt/
│   │   ├── builder.test.ts  - Prompt builder tests
│   │   └── sections.test.ts - Section builder tests
│   └── integration/
│       └── session.test.ts  - Full integration tests
└── tsconfig.json
```

### Key Components

1. SystemPrompt Builder
   - Takes configuration object
   - XML-style tag formatting
   - Modular section builders
   - Clear separation of concerns

2. SessionCoordinator
   - Request-scoped for single message
   - Manages all service interactions
   - Updates session DB with results
   - Handles tool call lifecycle

3. Context Building
   - Combines system prompt, files, dynamic content
   - Fresh context per message
   - Converts between types as needed

## Testing Plan

### Prompt Builder Tests

```typescript
test('builds complete system prompt', () => {
  const config: SystemPrompt = {
    instructions: 'Test instructions',
    tools: [{name: 'test_tool', description: 'Test tool'}],
    includeWorkspaceMetadata: true,
    includeSystemInfo: true,
    includeDateTime: true
  };

  const prompt = buildSystemPrompt(config);
  
  expect(prompt).toContain('<instructions>');
  expect(prompt).toContain('<tools>');
  expect(prompt).toContain('<workspace>');
  expect(prompt).toContain('<system>');
  expect(prompt).toContain('<datetime>');
});

test('handles optional sections', () => {
  const config: SystemPrompt = {
    instructions: 'Test instructions',
    tools: [],
    includeWorkspaceMetadata: false,
    includeSystemInfo: false,
    includeDateTime: false
  };

  const prompt = buildSystemPrompt(config);

  expect(prompt).toContain('<instructions>');
  expect(prompt).not.toContain('<workspace>');
  expect(prompt).not.toContain('<system>');
  expect(prompt).not.toContain('<datetime>');
});
```

### Context Building Tests

```typescript
test('builds context with all components', async () => {
  const coordinator = new SessionCoordinator({
    promptManager: mockPromptManager(),
    sessionManager: mockSessionManager(),
    mcpManager: mockMcpManager(),
    modelsManager: mockModelsManager(),
    filesManager: mockFilesManager(),
    dynamicContextManager: mockDynamicManager()
  });

  const context = await coordinator.buildContext('session-1');
  
  expect(context.systemPrompt).toBeDefined();
  expect(context.files).toHaveLength(2);
  expect(context.dynamicContext).toBeDefined();
  expect(context.history).toHaveLength(1);
});

test('handles missing optional managers', async () => {
  const coordinator = new SessionCoordinator({
    promptManager: mockPromptManager(),
    sessionManager: mockSessionManager(),
    mcpManager: mockMcpManager(),
    modelsManager: mockModelsManager()
  });

  const context = await coordinator.buildContext('session-1');
  
  expect(context.files).toHaveLength(0);
  expect(context.dynamicContext).toHaveLength(0);
});
```

### Session Flow Tests

```typescript
test('processes message with tools', async () => {
  const coordinator = new SessionCoordinator({...});

  await coordinator.handleMessage({
    sessionId: 'session-1',
    request: 'Test request'
  });

  // Verify session updates
  const session = await sessionManager.getSession('session-1');
  expect(session.turns).toHaveLength(1);
  expect(session.turns[0].toolCalls).toBeDefined();
});

test('handles streaming response', async () => {
  const coordinator = new SessionCoordinator({...});
  
  await coordinator.handleMessage({
    sessionId: 'session-1',
    request: 'Test request'
  });

  const session = await sessionManager.getSession('session-1');
  const turn = session.turns[0];
  expect(turn.content).toHaveLength(3); // Multiple chunks
});
```

## Implementation Steps

1. Prompt Package (2-3 days)
   - [ ] Define interfaces
   - [ ] Implement section builders
   - [ ] Core prompt assembly
   - [ ] Tests for each section
   - [ ] Full integration tests

2. Coordinator Shell (1-2 days)
   - [ ] Basic coordinator structure  
   - [ ] Error handling setup
   - [ ] Manager integration points
   - [ ] Initial tests

3. Context Building (2-3 days)
   - [ ] File gathering
   - [ ] Dynamic context resolution
   - [ ] History conversion
   - [ ] Tests for each piece

4. Message Processing (3-4 days)
   - [ ] Provider integration
   - [ ] Streaming updates
   - [ ] Tool call handling
   - [ ] Error handling
   - [ ] Full test coverage

5. Integration & Testing (2-3 days)
   - [ ] Full integration tests
   - [ ] Performance testing
   - [ ] Edge case handling
   - [ ] Documentation

## Example Usage

```typescript
// Initialize coordinator with workspace managers
const coordinator = new SessionCoordinator({
  promptManager: workspace.promptManager,
  sessionManager: workspace.sessionManager,
  mcpManager: workspace.mcpManager,
  modelsManager: workspace.modelsManager,
  filesManager: workspace.filesManager,
  dynamicContextManager: workspace.dynamicContextManager
});

// Handle single message
await coordinator.handleMessage({
  sessionId: 'session-1',
  request: 'Test request'
});
```

## Notes

- Each coordinator handles single message
- Fresh context built per message
- Direct DB updates from coordinator
- XML-style system prompts
- Clean error propagation
