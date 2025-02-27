# Workspace

## Overview

The Workspace package is the core data management layer for Mandrake. It provides a structured way to interact with workspace configurations, files, sessions, tools, and other components required for AI-assisted development. A workspace represents a project context that contains all necessary configuration and state for LLM interactions.

## Mandrake Directory Structure

The Mandrake application stores its configuration and workspaces in the `~/.mandrake` directory by default:

```sh
~/.mandrake/                   # Main Mandrake directory
├── mandrake.json              # Global configuration (theme, telemetry, workspace registry)
├── tools.json                 # Global tool configurations
├── models.json                # Global model configurations
├── prompt.json                # Global prompt template
├── mandrake.db                # Global session database
└── workspaces/                # Legacy directory for workspace storage
    └── [workspace-name]/      # Individual workspace directories (legacy location)
```

### Global Configuration

The MandrakeManager stores configuration in `mandrake.json` with the following structure:

```json
{
  "theme": "light" | "dark" | "system",
  "telemetry": boolean,
  "metadata": { [key: string]: string },
  "workspaces": [
    {
      "id": "uuid",
      "name": "workspace-name",
      "path": "/absolute/path/to/workspace",
      "description": "Optional workspace description",
      "lastOpened": "ISO8601 datetime string"
    }
  ]
}
```

### Important Note

All workspace creation should happen through the MandrakeManager to ensure proper registration in the central registry. While the system supports workspaces in the `~/.mandrake/workspaces/` directory, new workspaces can be created in any location on the filesystem as long as they are properly registered through the MandrakeManager. The MandrakeManager can also adopt workspaces that are created elsewhere and add them to the registry.

## Core Concepts

### Workspace Structure

A Mandrake workspace follows a well-defined directory structure:

```sh
/path/to/workspace/         # Workspace can be located anywhere
├── .ws/                    # Workspace data directory
│   ├── config/             # Configuration files
│   │   ├── workspace.json  # Workspace metadata
│   │   ├── dynamic.json    # Dynamic context definitions
│   │   ├── models.json     # LLM model configurations
│   │   ├── prompt.json     # System prompt configuration
│   │   └── tools.json      # Tool/MCP server configurations
│   ├── files/              # Context files managed by FilesManager
│   ├── mcpdata/            # Data storage for MCP servers
│   └── session.db          # SQLite database for session history
├──                         # The rest of the directory is operating space
```

### Manager Hierarchy

The package implements a hierarchical manager pattern:

- `MandrakeManager`: Manages global settings and workspace registration
  - Maintains a central registry of all workspaces in `mandrake.json`
  - Controls global configurations (theme, telemetry, etc.)
  - Acts as the single entry point for workspace creation, access, and deletion
  - Provides backward compatibility for legacy workspace locations
- `WorkspaceManager`: The top-level manager for a specific workspace
  - Manages workspace-specific configurations and resources
  - Coordinates all sub-managers for the workspace context
- Sub-managers:
  - `ToolsManager`: Manages MCP tool configurations
  - `ModelsManager`: Manages LLM provider configurations
  - `PromptManager`: Manages system prompt templates
  - `DynamicContextManager`: Manages dynamic context configurations
  - `FilesManager`: Manages workspace files
  - `SessionManager`: Manages conversation history using SQLite/Drizzle ORM

### Mandrake Configuration

The `MandrakeManager` stores global configuration in `~/.mandrake/mandrake.json` with the following structure:

```json
{
  "theme": "light" | "dark" | "system",
  "telemetry": true,
  "metadata": { 
    "key": "value"
  },
  "workspaces": [
    {
      "id": "uuid",
      "name": "workspace-name",
      "path": "/absolute/path/to/workspace",
      "description": "Optional workspace description",
      "lastOpened": "ISO8601 datetime string"
    },
    // ... additional workspaces
  ]
}
```

The `workspaces` array serves as the central registry for all workspaces managed by Mandrake. Each workspace entry contains:

- `id`: Unique identifier for the workspace
- `name`: User-friendly name (must be alphanumeric with dashes/underscores)
- `path`: Absolute filesystem path to the workspace
- `description`: Optional description
- `lastOpened`: Timestamp tracking when the workspace was last accessed

### Session State Model

The session data model tracks conversations with multiple levels of granularity:

- `Session`: A complete conversation thread
- `Round`: A user request and AI response pair
- `Request`: The user's input to the AI
- `Response`: The AI's response, potentially with multiple turns
- `Turn`: A part of a response, representing streaming content and tool calls

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

5. **Streaming Support**
   - Event-based system for real-time turn updates
   - Tool call handling with structured schema
   - Methods for tracking streaming status

## Usage

### Managing Workspaces

**Important**: All workspace operations must go through the MandrakeManager to ensure proper registration in the central registry.

```typescript
import { MandrakeManager } from '@mandrake/workspace';

// Initialize the Mandrake manager
const manager = new MandrakeManager('~/.mandrake');
await manager.init();

// Create a workspace in the default location (under ~/.mandrake/workspaces/)
const workspace = await manager.createWorkspace('my-project', 'My project description');

// Create a workspace in a custom location
const customWorkspace = await manager.createWorkspace(
  'custom-project', 
  'Custom project location', 
  '/path/to/custom/location'
);

// List all registered workspaces
const workspaces = await manager.listWorkspaces();
// This returns all workspaces registered in mandrake.json, including:
// - Workspaces in the default ~/.mandrake/workspaces/ location
// - Workspaces in custom locations
// - Legacy workspaces that have been migrated to the registry

// Get a specific workspace
const existingWorkspace = await manager.getWorkspace('my-project');
// This will automatically update the lastOpened timestamp in the registry

// Delete a workspace (removes from registry and deletes files)
await manager.deleteWorkspace('my-project');

// Unregister a workspace (removes from registry but keeps files)
await manager.unregisterWorkspace('my-project');
```

### Legacy Workspace Detection

The MandrakeManager automatically discovers workspaces in the legacy `~/.mandrake/workspaces/` directory and adds them to the registry:

```typescript
// This will find and register any workspaces in ~/.mandrake/workspaces/
// that aren't already in the registry
const workspaces = await manager.listWorkspaces();
```

### Working with a Workspace

```typescript
import { MandrakeManager } from '@mandrake/workspace';

// Initialize the MandrakeManager first
const manager = new MandrakeManager('~/.mandrake');
await manager.init();

// Get an existing workspace through the MandrakeManager
const workspace = await manager.getWorkspace('my-project');

// Or create a new one if needed
// const workspace = await manager.createWorkspace('new-project', 'Project description');

// Access and update workspace configuration
const config = await workspace.getConfig();
await workspace.updateConfig({ description: 'Updated description', metadata: { key: 'value' } });

// Work with sub-managers
// Configure LLM models
await workspace.models.addProvider('anthropic', {
  type: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY
});
await workspace.models.setActive('claude-3-5-sonnet-20241022');

// Add dynamic context
await workspace.dynamic.create({
  serverId: 'git',
  methodName: 'status',
  params: {},
  refresh: { enabled: true }
});
```

### Session and Streaming Management

```typescript
// Create a session
const session = await workspace.sessions.createSession({
  title: 'Initial planning',
  description: 'Project setup and architecture planning'
});

// Create a conversation round
const { round, request, response } = await workspace.sessions.createRound({
  sessionId: session.id,
  content: 'Help me structure my new Node.js project'
});

// Create an initial streaming turn
const turn = await workspace.sessions.createTurn({
  responseId: response.id,
  content: 'I will help you structure',
  rawResponse: 'I will help you structure',
  status: 'streaming',
  inputTokens: 10,
  outputTokens: 5,
  inputCost: 0.0001,
  outputCost: 0.00005
});

// Listen for updates to this turn
const removeListener = workspace.sessions.addTurnUpdateListener(turn.id, (updatedTurn) => {
  console.log('Turn updated:', updatedTurn.content);
});

// Update the turn with more content as it streams in
await workspace.sessions.updateTurn(turn.id, {
  content: 'I will help you structure your Node.js project.',
  rawResponse: 'I will help you structure your Node.js project.',
});

// Add a tool call
await workspace.sessions.updateTurn(turn.id, {
  content: 'I will help you structure your Node.js project. Let me check your package.json first.',
  toolCalls: {
    call: {
      serverName: 'fs',
      methodName: 'readFile',
      arguments: { path: 'package.json' }
    },
    response: null
  }
});

// Update with tool call response
await workspace.sessions.updateTurn(turn.id, {
  content: 'I will help you structure your Node.js project. I see you are using Express.',
  toolCalls: {
    call: {
      serverName: 'fs',
      methodName: 'readFile',
      arguments: { path: 'package.json' }
    },
    response: { dependencies: { express: '^4.18.2' } }
  },
  status: 'completed',
  streamEndTime: Math.floor(Date.now() / 1000)
});

// Clean up listener
removeListener();

// Track all streaming turns for a response
const stopTracking = workspace.sessions.trackStreamingTurns(response.id, (turn) => {
  console.log(`Turn ${turn.id} updated:`, turn.status, turn.content.length);
});

// Check streaming status
const status = await workspace.sessions.getStreamingStatus(response.id);
console.log('Is streaming complete?', status.isComplete);

// Stop tracking when done
stopTracking();

// Get full session history with parsed tool calls
const history = await workspace.sessions.renderSessionHistory(session.id);
```

## Key Interfaces

### MandrakeManager

```typescript
class MandrakeManager {
  // Sub-managers
  readonly tools: ToolsManager;
  readonly models: ModelsManager;
  readonly prompt: PromptManager;
  readonly sessions: SessionManager;
  
  // Initialization
  async init(): Promise<void>;
  
  // Workspace management
  async createWorkspace(name: string, description?: string, path?: string): Promise<WorkspaceManager>;
  async getWorkspace(name: string): Promise<WorkspaceManager>;
  async listWorkspaces(): Promise<{ name: string; path: string; description?: string; }[]>;
  async deleteWorkspace(name: string): Promise<void>;
  
  // Config management
  async getConfig(): Promise<MandrakeConfig>;
  async updateConfig(updates: Partial<MandrakeConfig>): Promise<void>;
}
```

### WorkspaceManager

```typescript
class WorkspaceManager {
  // Properties
  readonly name: string;
  
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
  // Initialization
  async init(): Promise<void>;
  
  // Session operations
  async createSession(opts: { title?: string; description?: string; metadata?: Record<string, string>; }): Promise<Session>;
  async getSession(id: string): Promise<Session>;
  async listSessions(opts?: { workspaceId?: string; limit?: number; offset?: number; }): Promise<Session[]>;
  async updateSession(id: string, updates: { title?: string; description?: string; metadata?: Record<string, string>; }): Promise<Session>;
  async deleteSession(id: string): Promise<void>;
  
  // Round management
  async createRound(opts: { sessionId: string; content: string; }): Promise<{ round: Round; request: Request; response: Response; }>;
  async getRound(id: string): Promise<{ round: Round; request: Request; response: Response; }>;
  async listRounds(sessionId: string): Promise<Round[]>;
  
  // Turn management
  async createTurn(opts: { responseId: string; content: string; rawResponse: string; toolCalls?: ToolCall; status?: 'streaming' | 'completed' | 'error'; inputTokens: number; outputTokens: number; inputCost: number; outputCost: number; }): Promise<Turn>;
  async updateTurn(id: string, updates: { content?: string; rawResponse?: string; toolCalls?: ToolCall; status?: 'streaming' | 'completed' | 'error'; streamEndTime?: number; currentTokens?: number; expectedTokens?: number; inputTokens?: number; outputTokens?: number; inputCost?: number; outputCost?: number; }): Promise<Turn>;
  async getTurn(id: string): Promise<Turn>;
  async getTurnWithParsedToolCalls(id: string): Promise<Turn & { parsedToolCalls: ToolCall }>;
  async listTurns(responseId: string): Promise<Turn[]>;
  async listTurnsWithParsedToolCalls(responseId: string): Promise<(Turn & { parsedToolCalls: ToolCall })[]>;
  
  // Streaming support
  addTurnUpdateListener(turnId: string, listener: (turn: Turn) => void): () => void;
  trackStreamingTurns(responseId: string, onUpdate: (turn: Turn) => void): () => void;
  getStreamingStatus(responseId: string): Promise<{ isComplete: boolean; turns: Turn[]; }>;
  
  // History rendering
  async renderSessionHistory(id: string): Promise<{ session: Session; rounds: Array<Round & { request: Request; response: Response & { turns: Array<Turn & { parsedToolCalls: ToolCall }>; }; }>; }>;
}
```

## Integration Points

The Workspace package integrates with other Mandrake components:

- **Provider Package**: Uses model configurations from the workspace to initialize LLM providers
- **MCP Package**: Relies on tool configurations from the workspace to set up MCP servers
- **Session Package**: Builds on the workspace session manager for conversation management
- **Web App**: Provides APIs for the frontend to interact with workspace data including real-time streaming
- **Utils Package**: Leverages logger and type definitions from the utils package

The Workspace is the central state management component that ties together all aspects of the Mandrake experience, from configuration to execution.
