# Workspace

## Overview

The Workspace package is the core data management layer for Mandrake. It provides a structured way to interact with workspace configurations, files, sessions, tools, and other components required for AI-assisted development. A workspace represents a project context, similar to Claude projects, containing all necessary configuration and state for LLM interactions.

## Core Concepts

### Workspace Structure

A Mandrake workspace follows a well-defined directory structure:

```sh
~/.mandrake/workspaces/{name}/
├── .ws/
│   ├── config/                # Configuration files
│   │   ├── dynamic.json      # Dynamic context definitions
│   │   ├── models.json       # LLM model configurations
│   │   ├── prompt.json       # System prompt configuration
│   │   └── tools.json        # Tool/MCP server configurations
│   ├── files/                # Context files managed by FilesManager
│   ├── mcpdata/              # Data storage for MCP servers
│   └── session.db            # SQLite database for session history
├── src/                      # Source code directory (typically a git repo)
└── workspace.json            # Workspace metadata
```

### Manager Hierarchy

The package implements a hierarchical manager pattern:

- `WorkspaceManager`: The top-level manager that coordinates all sub-managers
- Sub-managers:
  - `ToolsManager`: Manages MCP tool configurations
  - `ModelsManager`: Manages LLM provider configurations
  - `PromptManager`: Manages system prompt templates
  - `DynamicContextManager`: Manages dynamic context configurations
  - `FilesManager`: Manages workspace files
  - `SessionManager`: Manages conversation history using SQLite/Drizzle ORM

### Session State Model

The session data model tracks conversations with multiple levels of granularity:

- `Session`: A complete conversation thread
- `Round`: A user request and AI response pair
- `Request`: The user's input to the AI
- `Response`: The AI's response, potentially with multiple turns
- `Turn`: A part of a response, often representing a streaming chunk or tool call cycle

## Architecture

The Workspace package is built around a modular architecture:

1. **Base Configuration Layer**
   - `BaseConfigManager`: Abstract class providing JSON file operations
   - Uses Zod schemas for validation and type safety

2. **Specialized Managers**
   - Each manager extends `BaseConfigManager` for its specific domain
   - Managers provide high-level operations (create, read, update, delete)

3. **Database Layer**
   - Drizzle ORM with SQLite for session storage
   - Migrations for schema versioning
   - Structured queries for efficient data access

4. **File System Interface**
   - Path utilities for consistent directory structure
   - File system operations with proper error handling

## Usage

```typescript
import { WorkspaceManager } from '@mandrake/workspace';

// Create a new workspace manager
const manager = new WorkspaceManager('~/.mandrake/workspaces', 'my-project');

// Initialize with defaults
await manager.init('My project description');

// Access and update workspace configuration
const config = await manager.getConfig();
await manager.updateConfig({ description: 'Updated description' });

// Work with sub-managers
// Configure LLM models
await manager.models.addProvider('anthropic', {
  type: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
});
await manager.models.setActive('claude-3-5-sonnet-20241022');

// Add dynamic context
await manager.dynamic.create({
  serverId: 'git',
  methodName: 'status',
  params: {},
  refresh: { enabled: true }
});

// Create a session
const session = await manager.sessions.createSession({
  title: 'Initial planning',
  description: 'Project setup and architecture planning'
});

// Create a conversation round
const { round, request, response } = await manager.sessions.createRound({
  sessionId: session.id,
  content: 'Help me structure my new Node.js project'
});

// Add a response turn
await manager.sessions.createTurn({
  responseId: response.id,
  content: 'Here are some recommendations...',
  rawResponse: JSON.stringify({ content: 'Here are some recommendations...' }),
  inputTokens: 150,
  outputTokens: 250,
  inputCost: 0.0015,
  outputCost: 0.0025
});

// Render complete session history
const history = await manager.sessions.renderSessionHistory(session.id);
```

## Key Interfaces

### WorkspaceManager

```typescript
class WorkspaceManager {
  // Sub-managers
  readonly tools: ToolsManager;
  readonly models: ModelsManager;
  readonly prompt: PromptManager;
  readonly dynamic: DynamicContextManager;
  readonly files: FilesManager;
  readonly sessions: SessionManager;
  
  // Initialization
  async init(description?: string): Promise<void>;
  
  // Config management
  async getConfig(): Promise<Workspace>;
  async updateConfig(updates: Partial<Workspace>): Promise<void>;
}
```

### SessionManager

```typescript
class SessionManager {
  async init(): Promise<void>;
  
  // Session operations
  async createSession(opts: {...}): Promise<Session>;
  async getSession(id: string): Promise<Session>;
  async listSessions(opts?: {...}): Promise<Session[]>;
  async updateSession(id: string, updates: {...}): Promise<Session>;
  async deleteSession(id: string): Promise<void>;
  
  // Round and turn management
  async createRound(opts: {...}): Promise<{round, request, response}>;
  async createTurn(opts: {...}): Promise<Turn>;
  async renderSessionHistory(id: string): Promise<{...}>;
}
```

## Integration Points

The Workspace package integrates with other Mandrake components:

- **Provider Package**: Uses model configurations from the workspace to initialize LLM providers
- **MCP Package**: Relies on tool configurations from the workspace to set up MCP servers
- **Session Package**: Builds on the workspace session manager for conversation management
- **Web App**: Provides APIs for the frontend to interact with workspace data
- **Utils Package**: Leverages logger and type definitions from the utils package

The workspace is the central state management component that ties together all aspects of the Mandrake experience, from configuration to execution.
