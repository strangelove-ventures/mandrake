# Workspace

## Overview

The Workspace package provides a structured data management layer for managing project workspaces. It handles configuration files, session storage, file management, and various workspace-specific settings through a hierarchical manager pattern.

## Core Concepts

### Workspace Structure

A workspace follows a well-defined directory structure:

```sh
/path/to/workspace/         # Workspace root directory
├── .ws/                    # Workspace data directory
│   ├── config/             # Configuration files
│   │   ├── workspace.json  # Workspace metadata
│   │   ├── dynamic.json    # Dynamic context definitions
│   │   ├── models.json     # Model configurations
│   │   ├── prompt.json     # Prompt configuration
│   │   └── tools.json      # Tool configurations
│   ├── files/              # Managed context files
│   ├── mcpdata/            # Data storage directory
│   └── session.db          # SQLite database for sessions
└── [project files]         # User's project files
```

### Manager Hierarchy

The package implements a hierarchical manager pattern:

- `MandrakeManager`: Central manager for global settings and workspace registry
  - Maintains a registry of all workspaces
  - Manages global configurations
  - Provides workspace lifecycle operations

- `WorkspaceManager`: Manager for individual workspace instances
  - Coordinates all workspace-specific sub-managers
  - Provides unified access to workspace resources

- Sub-managers:
  - `ToolsManager`: Manages tool configurations
  - `ModelsManager`: Manages model configurations
  - `PromptManager`: Manages prompt templates
  - `DynamicContextManager`: Manages dynamic context configurations
  - `FilesManager`: Manages workspace context files
  - `SessionManager`: Manages conversation history

### Configuration Management

Configuration is handled through dedicated managers:

- `BaseConfigManager`: Abstract base class providing:
  - JSON file operations with validation
  - Error handling and default values
  - Type safety through Zod schemas

- `MandrakeConfigManager`: Global configuration management
  - Workspace registration and discovery
  - Global settings persistence

- `WorkspaceConfigManager`: Workspace-specific configuration
  - Workspace metadata management
  - Configuration consistency

### Session Model

The session system tracks conversation history with these entities:

- `Session`: A conversation thread
- `Round`: A request-response pair
- `Request`: User input
- `Response`: Assistant output
- `Turn`: A segment of a response (supports streaming)

## Key Components

### MandrakeManager

```typescript
class MandrakeManager {
  constructor(root: string);
  async init(): Promise<void>;
  
  // Workspace operations
  async createWorkspace(name: string, description?: string, path?: string): Promise<WorkspaceManager>;
  async getWorkspace(id: string): Promise<WorkspaceManager>;
  async listWorkspaces(): Promise<RegisteredWorkspace[]>;
  async deleteWorkspace(id: string): Promise<void>;
  async unregisterWorkspace(id: string): Promise<void>;
  async adoptWorkspace(name: string, workspacePath: string, description?: string): Promise<WorkspaceManager>;
}
```

### WorkspaceManager

```typescript
class WorkspaceManager {
  readonly id: string;
  readonly name: string;
  readonly paths: WorkspacePaths;
  
  // Sub-managers
  readonly config: WorkspaceConfigManager;
  readonly tools: ToolsManager;
  readonly models: ModelsManager;
  readonly prompt: PromptManager;
  readonly dynamic: DynamicContextManager;
  readonly files: FilesManager;
  readonly sessions: SessionManager;
  
  constructor(path: string, name: string, id: string);
  async init(description?: string): Promise<void>;
}
```

### SessionManager

```typescript
class SessionManager {
  // Session operations
  async createSession(opts: SessionOptions): Promise<Session>;
  async getSession(id: string): Promise<Session>;
  async listSessions(opts?: ListOptions): Promise<Session[]>;
  async updateSession(id: string, updates: SessionUpdates): Promise<Session>;
  async deleteSession(id: string): Promise<void>;
  
  // Round operations
  async createRound(opts: RoundOptions): Promise<RoundResult>;
  async getRound(id: string): Promise<RoundData>;
  async listRounds(sessionId: string): Promise<Round[]>;
  
  // Turn operations
  async createTurn(opts: TurnOptions): Promise<Turn>;
  async updateTurn(id: string, updates: TurnUpdates): Promise<Turn>;
  async getTurn(id: string): Promise<Turn>;
  
  // Streaming support
  addTurnUpdateListener(turnId: string, listener: (turn: Turn) => void): () => void;
  trackStreamingTurns(responseId: string, onUpdate: (turn: Turn) => void): () => void;
  
  // History rendering
  async renderSessionHistory(id: string): Promise<SessionHistory>;
}
```

## Usage Examples

### Creating and Managing Workspaces

```typescript
import { MandrakeManager } from '@mandrake/workspace';

// Initialize the manager
const manager = new MandrakeManager('/path/to/mandrake/root');
await manager.init();

// Create a new workspace
const workspace = await manager.createWorkspace('my-project', 'Project description');
console.log(`Created workspace with ID: ${workspace.id}`);

// List all workspaces
const workspaces = await manager.listWorkspaces();
workspaces.forEach(ws => {
  console.log(`${ws.name} (${ws.id}) at ${ws.path}`);
});

// Get an existing workspace
const existing = await manager.getWorkspace(workspace.id);
```

### Working with Workspace Data

```typescript
// Configure models
await workspace.models.addProvider('anthropic', {
  type: 'anthropic',
  apiKey: 'your-api-key'
});
await workspace.models.setActive('claude-3-5-sonnet-20241022');

// Manage files
await workspace.files.add('/path/to/file.ts', 'typescript');
const files = await workspace.files.list();

// Create and manage sessions
const session = await workspace.sessions.createSession({
  title: 'Development Session',
  description: 'Working on new features'
});

// Create a conversation round
const { round, request, response } = await workspace.sessions.createRound({
  sessionId: session.id,
  content: 'Help me implement a new feature'
});
```

### Session Streaming

```typescript
// Create a streaming turn
const turn = await workspace.sessions.createTurn({
  responseId: response.id,
  content: 'Starting response...',
  rawResponse: 'Starting response...',
  status: 'streaming',
  inputTokens: 10,
  outputTokens: 5,
  inputCost: 0.0001,
  outputCost: 0.00005
});

// Listen for updates
const removeListener = workspace.sessions.addTurnUpdateListener(turn.id, (updated) => {
  console.log('Turn updated:', updated.content);
});

// Update the turn as content streams in
await workspace.sessions.updateTurn(turn.id, {
  content: 'Starting response... Here is the implementation.',
  status: 'completed'
});

// Clean up listener
removeListener();
```

## Configuration Schemas

The package uses Zod schemas for type-safe configuration:

- `WorkspaceSchema`: Workspace metadata and settings
- `ToolSchema`: Tool configuration
- `ModelProviderConfigSchema`: Model provider settings
- `PromptConfigSchema`: Prompt template configuration
- `DynamicContextSchema`: Dynamic context definitions

## Database Schema

Session data is stored in SQLite using Drizzle ORM with tables for:

- `sessions`: Conversation threads
- `rounds`: Request-response pairs
- `requests`: User inputs
- `responses`: Assistant outputs
- `turns`: Response segments with streaming support

## Error Handling

The package provides specific error types:

- `WorkspaceNotFoundError`: Workspace doesn't exist
- `ConfigurationError`: Invalid configuration
- `SessionNotFoundError`: Session doesn't exist
- `DatabaseError`: Database operation failures

## Path Management

The package provides utilities for consistent path management:

- `MandrakePaths`: Global directory structure
- `WorkspacePaths`: Workspace-specific paths
- Path validation and normalization
- Safe file operations
