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
└── workspaces/                # Directory for workspace storage
    └── [workspace-name]/      # Individual workspace directories
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

All workspace operations must go through the MandrakeManager to ensure proper registration in the central registry. Each workspace is identified by a unique UUID, which is used consistently throughout the system. While the user-friendly name is important for display and filesystem organization, the UUID is the primary identifier for all operations.

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

The package implements a hierarchical manager pattern with dedicated configuration managers:

- `MandrakeManager`: Manages global settings and workspace registration
  - Uses `MandrakeConfigManager` to handle configuration persistence
  - Maintains a central registry of all workspaces
  - Controls global configurations (theme, telemetry, etc.)
  - Acts as the single entry point for workspace creation, access, and deletion

- `WorkspaceManager`: The top-level manager for a specific workspace
  - Uses `WorkspaceConfigManager` to handle configuration persistence
  - Coordinates all sub-managers for the workspace context
  - Manages workspace-specific resources

- Sub-managers:
  - `ToolsManager`: Manages MCP tool configurations
  - `ModelsManager`: Manages LLM provider configurations
  - `PromptManager`: Manages system prompt templates
  - `DynamicContextManager`: Manages dynamic context configurations
  - `FilesManager`: Manages workspace files
  - `SessionManager`: Manages conversation history using SQLite/Drizzle ORM

### Configuration Management

Each manager uses a dedicated configuration manager to handle persistence:

- `BaseConfigManager`: Abstract base class for all configuration managers
  - Provides file reading, writing, and validation
  - Handles error conditions and default configurations
  - Works with Zod schemas for type safety

- `MandrakeConfigManager`: Manages the central configuration
  - Handles workspace registration and lookup by ID or name
  - Tracks workspace timestamps and metadata

- `WorkspaceConfigManager`: Manages workspace-specific configuration
  - Ensures ID consistency
  - Provides access to workspace metadata

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
   - Implements idempotent initialization and error handling

2. **Configuration Managers**
   - `MandrakeConfigManager`: Handles global configuration
   - `WorkspaceConfigManager`: Handles workspace-specific configuration
   - Each specialized manager has methods tailored to its domain

3. **Resource Managers**
   - Each manager provides domain-specific operations
   - Managers rely on configuration managers for persistence
   - Clean separation of concerns

4. **Database Layer**
   - Drizzle ORM with SQLite for session storage
   - Sessions linked to workspaces via workspace ID
   - Structured queries for efficient data access

5. **File System Interface**
   - Path utilities for consistent directory structure
   - File system operations with proper error handling

6. **Streaming Support**
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
const workspaceId = workspace.id; // Store this ID for future reference

// Create a workspace in a custom location
const customWorkspace = await manager.createWorkspace(
  'custom-project', 
  'Custom project location', 
  '/path/to/custom/location'
);

// List all registered workspaces
const workspaces = await manager.listWorkspaces();
// Returns array with: { id, name, path, description, lastOpened }

// Get a workspace by ID (recommended)
const existingWorkspace = await manager.getWorkspace(workspaceId);
// This will automatically update the lastOpened timestamp in the registry

// Delete a workspace by ID
await manager.deleteWorkspace(workspaceId);

// Unregister a workspace (removes from registry but keeps files)
await manager.unregisterWorkspace(workspaceId);

// Adopt an existing workspace from another location
const adoptedWorkspace = await manager.adoptWorkspace(
  'existing-project',
  '/path/to/existing/workspace',
  'Optional description'
);
```

### Working with a Workspace

```typescript
import { MandrakeManager } from '@mandrake/workspace';

// Initialize the MandrakeManager first
const manager = new MandrakeManager('~/.mandrake');
await manager.init();

// Get an existing workspace by ID through the MandrakeManager
const workspace = await manager.getWorkspace(workspaceId);

// Or create a new one if needed
// const workspace = await manager.createWorkspace('new-project', 'Project description');

// Access the workspace ID
console.log(`Working with workspace ID: ${workspace.id}`);

// Access and update workspace configuration
const config = await workspace.config.getConfig();
await workspace.config.updateConfig({ description: 'Updated description', metadata: { key: 'value' } });

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

### Session Management

Sessions are now implicitly associated with their workspace through the database file, removing the need to specify workspaceId in most operations:

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

// Create a streaming turn
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

// Get full session history with parsed tool calls
const history = await workspace.sessions.renderSessionHistory(session.id);
```

## Key Interfaces

### MandrakeManager

```typescript
class MandrakeManager {
  // Properties
  readonly config: MandrakeConfigManager;
  readonly paths: MandrakePaths;
  
  // Sub-managers
  readonly tools: ToolsManager;
  readonly models: ModelsManager;
  readonly prompt: PromptManager;
  readonly sessions: SessionManager;
  
  // Initialization
  constructor(root: string);
  async init(): Promise<void>;
  
  // Workspace management by ID
  async createWorkspace(name: string, description?: string, path?: string): Promise<WorkspaceManager>;
  async getWorkspace(id: string): Promise<WorkspaceManager>;
  async listWorkspaces(): Promise<{ id: string; name: string; path: string; description?: string; lastOpened?: string; }[]>;
  async deleteWorkspace(id: string): Promise<void>;
  async unregisterWorkspace(id: string): Promise<void>;
  async adoptWorkspace(name: string, workspacePath: string, description?: string): Promise<WorkspaceManager>;
}
```

### WorkspaceManager

```typescript
class WorkspaceManager {
  // Properties
  readonly id: string;
  readonly name: string;
  readonly paths: WorkspacePaths;
  readonly config: WorkspaceConfigManager;
  
  // Sub-managers
  readonly tools: ToolsManager;
  readonly models: ModelsManager;
  readonly prompt: PromptManager;
  readonly dynamic: DynamicContextManager;
  readonly files: FilesManager;
  readonly sessions: SessionManager;
  
  // Initialization
  constructor(path: string, name: string, id: string);
  async init(description?: string): Promise<void>;
}
```

### Configuration Managers

```typescript
abstract class BaseConfigManager<T> {
  // Core operations
  protected async read(): Promise<T>;
  protected async write(data: T): Promise<void>;
  public async exists(): Promise<boolean>;
  public async init(): Promise<void>;
  protected abstract getDefaults(): T;
}

class MandrakeConfigManager extends BaseConfigManager<MandrakeConfig> {
  // Registry operations
  async registerWorkspace(workspace: RegisteredWorkspace): Promise<void>;
  async unregisterWorkspaceById(id: string): Promise<RegisteredWorkspace | null>;
  async updateWorkspaceTimestamp(id: string): Promise<boolean>;
  async findWorkspaceById(id: string): Promise<RegisteredWorkspace | null>;
  async findWorkspaceByName(name: string): Promise<RegisteredWorkspace | null>;
  async listWorkspaces(): Promise<RegisteredWorkspace[]>;
  
  // Config operations
  async getConfig(): Promise<MandrakeConfig>;
  async updateConfig(updates: Partial<MandrakeConfig>): Promise<void>;
}

class WorkspaceConfigManager extends BaseConfigManager<Workspace> {
  // Config operations
  async getConfig(): Promise<Workspace>;
  async updateConfig(updates: Partial<Workspace>): Promise<void>;
}
```

### SessionManager

```typescript
class SessionManager {
  // Initialization
  async init(): Promise<void>;
  setWorkspaceId(id: string): void;
  
  // Session operations
  async createSession(opts: { title?: string; description?: string; metadata?: Record<string, string>; }): Promise<Session>;
  async getSession(id: string): Promise<Session>;
  async listSessions(opts?: { limit?: number; offset?: number; }): Promise<Session[]>;
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
