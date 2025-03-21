# WorkspaceManager and MandrakeManager Service Documentation

This document provides detailed documentation of the WorkspaceManager and MandrakeManager services, focusing on their role in managing workspaces, configurations, and coordinating other services.

## Service Overview

### MandrakeManager

The MandrakeManager is the top-level service responsible for:
- Managing the global Mandrake configuration
- Providing a registry of workspaces
- Initializing system-level managers for sessions, tools, models, and prompts
- Creating, loading, and managing workspaces

### WorkspaceManager

The WorkspaceManager is responsible for:
- Managing a single workspace's configuration and resources
- Initializing workspace-specific managers for sessions, tools, models, prompts, etc.
- Providing access to workspace-specific files and contexts
- Managing workspace directories and configuration files

## Initialization Requirements

### MandrakeManager Configuration

- **root**: The root directory for Mandrake (typically ~/.mandrake)

### WorkspaceManager Configuration

- **path**: Parent directory containing the workspace
- **name**: Name of the workspace
- **id**: Unique identifier for the workspace

### Directory Structure

**MandrakeManager Directories**:
```
~/.mandrake/
├── config/           # System configuration files
├── db.sqlite         # System session database
├── models/           # System model configurations
├── prompt/           # System prompt templates
├── tools/            # System tool configurations
└── workspaces/       # Default location for workspaces
```

**WorkspaceManager Directories**:
```
{workspace}/
├── .ws/              # Workspace metadata directory
│   ├── config/       # Workspace configuration files
│   ├── db.sqlite     # Workspace session database
│   ├── files/        # Workspace file storage
│   ├── mcpdata/      # Workspace MCP server data
│   └── workspace.json # Workspace metadata
├── .ws-config        # Legacy workspace configuration
└── ... (project files)
```

### Instantiation Process

**MandrakeManager**:
```typescript
// Create manager with root directory
const mandrakeManager = new MandrakeManager(home);
// Initialize directories and sub-managers
await mandrakeManager.init();
```

**WorkspaceManager**:
```typescript
// Create manager with parent directory, name, and ID
const workspace = new WorkspaceManager(workspaceParentDir, name, workspaceId);
// Initialize directories and sub-managers
await workspace.init(description);
```

### Sub-Manager Initialization

Both managers initialize a set of sub-managers in their constructors:

**MandrakeManager**:
```typescript
this.config = new MandrakeConfigManager(paths.config);
this.tools = new ToolsManager(paths.tools);
this.models = new ModelsManager(paths.models);
this.prompt = new PromptManager(paths.prompt);
this.sessions = new SessionManager(paths.db);
```

**WorkspaceManager**:
```typescript
this.tools = new ToolsManager(paths.tools);
this.models = new ModelsManager(paths.models);
this.prompt = new PromptManager(paths.systemPrompt);
this.dynamic = new DynamicContextManager(paths.context);
this.files = new FilesManager(paths.files);
this.sessions = new SessionManager(paths.db);
this.config = new WorkspaceConfigManager(paths.workspace, id, name);
```

### Init Method Execution

During `init()`, both managers create necessary directories and initialize all sub-managers:

**MandrakeManager**:
```typescript
async init(): Promise<void> {
  // Create main directory and workspaces directory
  await Promise.all([
    mkdir(this.paths.root, { recursive: true }),
    mkdir(join(this.paths.root, 'workspaces'), { recursive: true })
  ]);

  // Initialize all components
  await Promise.all([
    this.config.init(),
    this.sessions.init(),
    this.tools.init(),
    this.models.init(),
    this.prompt.init(),
  ]);
}
```

**WorkspaceManager**:
```typescript
async init(description?: string): Promise<void> {
  // Create directory structure
  await Promise.all([
    mkdir(this.paths.root, { recursive: true }),
    mkdir(this.paths.wsDir, { recursive: true }),
    mkdir(this.paths.config, { recursive: true }),
    mkdir(this.paths.mcpdata, { recursive: true })
  ]);

  // Initialize all components
  await Promise.all([
    this.tools.init(),
    this.models.init(),
    this.prompt.init(),
    this.dynamic.init(),
    this.files.init(),
    this.sessions.init(),
    this.config.init(description),
  ]);
}
```

## Persistence Considerations

### Directory and File Management

- Both managers create and manage directory structures on initialization
- Configuration files are stored in their respective config directories
- SessionManager instances create and manage SQLite databases

### Configuration Persistence

- **MandrakeManager**: Stores workspace registry in configuration files
- **WorkspaceManager**: Stores workspace-specific settings in configuration files

### StateFul Sub-Managers

Both managers create and initialize several stateful sub-managers:
1. **SessionManager**: SQLite database connections with file locks
2. **Tools/Models/Prompt Managers**: File-based configuration persistence

## Service Responsibilities

### MandrakeManager Responsibilities

1. **Workspace Registry Management**:
   - Register new workspaces
   - List available workspaces
   - Get workspace by ID
   - Delete or unregister workspaces

2. **System-Level Services**:
   - Provide system tools configuration
   - Manage system-level session database
   - Provide system prompt templates

3. **Workspace Creation**:
   - Create new workspaces with proper structure
   - Initialize workspace configuration
   - Set up workspace directory structure

### WorkspaceManager Responsibilities

1. **Workspace Configuration**:
   - Manage workspace-specific settings
   - Provide workspace ID and metadata
   - Manage workspace directory paths

2. **Workspace Resources**:
   - Manage workspace file storage
   - Provide dynamic context handling
   - Manage workspace-specific sessions

3. **Sub-Manager Coordination**:
   - Initialize all workspace-specific managers
   - Provide access to tool, model, and prompt configurations
   - Manage workspace session database

## Service Dependencies

### MandrakeManager Dependencies

- **Filesystem Access**: Node.js fs/promises for directory operations
- **Workspace Registry**: Configuration files for workspace tracking
- **SessionManager**: For system-level session database

### WorkspaceManager Dependencies

- **Filesystem Access**: Node.js fs/promises for directory operations
- **Workspace Configuration**: Configuration files for workspace settings
- **SessionManager**: For workspace-specific session database
- **Various Sub-Managers**: For tool, model, prompt, file, and dynamic context management

## Service Usage in API

### MandrakeManager Usage

```typescript
// Initialize API
const mandrakeManager = new MandrakeManager(home);
await mandrakeManager.init();

// List workspaces
const workspaces = await mandrakeManager.listWorkspaces();

// Create a new workspace
const workspace = await mandrakeManager.createWorkspace(name, description, path);

// Get a workspace
const workspace = await mandrakeManager.getWorkspace(id);

// Delete a workspace
await mandrakeManager.deleteWorkspace(id);
```

### WorkspaceManager Usage

```typescript
// Create workspace
const workspace = new WorkspaceManager(parentDir, name, id);
await workspace.init(description);

// Access sub-managers
const sessionManager = workspace.sessions;
const toolsManager = workspace.tools;
const filesManager = workspace.files;

// Access workspace paths
const rootPath = workspace.paths.root;
const configPath = workspace.paths.config;
```

## Integration with API Routes

### Workspace Routes

```typescript
// List all workspaces
app.get('/', async (c) => {
  const workspaces = await managers.mandrakeManager.listWorkspaces();
  return c.json(workspaces);
});

// Create a new workspace
app.post('/', async (c) => {
  const { name, description, path } = await c.req.json();
  const workspace = await managers.mandrakeManager.createWorkspace(name, description, path);
  managers.workspaceManagers.set(workspace.id, workspace);
  return c.json(response);
});

// Get workspace details
app.get('/:workspaceId', async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const workspaceData = await managers.mandrakeManager.getWorkspace(workspaceId);
  return c.json(response);
});
```

### Workspace Middleware

```typescript
// Middleware for injecting workspace context
export function createWorkspaceMiddleware(accessors: ManagerAccessors) {
  return async (c: any, next: () => Promise<void>) => {
    const workspaceId = c.req.param('workspaceId');
    const workspace = accessors.getWorkspaceManager(workspaceId);
    const mcpManager = accessors.getMcpManager(workspaceId);
      
    if (!workspace) {
      return c.json({ error: 'Workspace not found' }, 404);
    }
    
    // Make these available to all subroutes
    c.set('workspace', workspace);
    c.set('mcpManager', mcpManager);
    c.set('workspaceId', workspaceId);
    
    await next();
  };
}
```

## Known Issues and Limitations

1. **No Service Lifecycle Management**:
   - No explicit cleanup methods for managers
   - No coordinated shutdown of sub-managers
   - Potential resource leaks from SQLite connections and processes

2. **File Locking Conflicts**:
   - Multiple processes may attempt to initialize the same workspace
   - No coordination of SQLite database access
   - No mechanism for sharing database connections

3. **Error Recovery Limitations**:
   - Limited error handling during initialization
   - No automatic recovery from filesystem errors
   - Inconsistent error propagation

4. **State Synchronization**:
   - No synchronization between MandrakeManager's workspace registry and actual workspaces
   - Potential for orphaned workspace directories
   - No mechanism for workspace locking during operations

## Improvement Recommendations

### 1. Implement Manager Lifecycle Methods

```typescript
class EnhancedMandrakeManager {
  // Existing methods...
  
  /**
   * Clean up all resources used by this manager and its sub-managers
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up MandrakeManager');
    
    // Clean up sessions database
    await this.sessions.close();
    
    // Clean up all sub-managers that support cleanup
    await Promise.all([
      this.tools.cleanup?.(),
      this.models.cleanup?.(),
      this.prompt.cleanup?.(),
      this.config.cleanup?.()
    ].filter(Boolean));
    
    this.logger.info('MandrakeManager cleanup complete');
  }
  
  /**
   * Get manager health status
   */
  getStatus(): ManagerStatus {
    return {
      isHealthy: true,
      subManagers: {
        sessions: { isHealthy: true },
        tools: { isHealthy: true },
        models: { isHealthy: true },
        prompt: { isHealthy: true },
        config: { isHealthy: true }
      }
    };
  }
}
```

### 2. Implement Database Connection Pool

Create a shared database connection pool for all SessionManager instances:

```typescript
class EnhancedWorkspaceManager {
  constructor(
    path: string, 
    name: string, 
    id: string,
    options?: {
      databasePool?: DatabaseConnectionPool
    }
  ) {
    // ...existing initialization...
    
    // Use shared database connection if provided
    if (options?.databasePool) {
      this.sessions = new SessionManager(paths.db, { 
        connectionPool: options.databasePool 
      });
    } else {
      this.sessions = new SessionManager(paths.db);
    }
  }
}
```

### 3. Enhance Error Handling

Improve error handling and recovery during initialization:

```typescript
async init(description?: string): Promise<void> {
  this.logger.info('Initializing workspace', { path: this.paths.root });

  try {
    // Create directories with error handling
    await this.createDirectoryStructure();
    
    // Initialize components with error handling
    await this.initializeComponents(description);
    
    this.logger.info('Workspace initialized successfully');
  } catch (error) {
    this.logger.error('Workspace initialization failed', { 
      error: error instanceof Error ? error.message : String(error),
      path: this.paths.root
    });
    
    // Attempt cleanup of partially initialized state
    await this.cleanupFailedInit();
    
    // Rethrow with enhanced context
    throw new Error(`Failed to initialize workspace at ${this.paths.root}: ${error}`);
  }
}
```

### 4. Implement Workspace Locking

Add locking mechanisms to prevent concurrent modification:

```typescript
class WorkspaceLockManager {
  private locks = new Map<string, {
    holder: string;
    acquired: number;
    expires: number;
  }>();
  
  /**
   * Acquire a lock on a workspace
   */
  async acquireLock(workspaceId: string, holder: string, timeoutMs: number = 5000): Promise<boolean> {
    // Implementation details...
  }
  
  /**
   * Release a workspace lock
   */
  releaseLock(workspaceId: string, holder: string): boolean {
    // Implementation details...
  }
  
  /**
   * Check if a workspace is locked
   */
  isLocked(workspaceId: string): boolean {
    // Implementation details...
  }
}
```

### 5. Implement Workspace Synchronization

Enhance MandrakeManager to synchronize workspace registry with filesystem:

```typescript
/**
 * Synchronize workspace registry with filesystem
 */
async synchronizeWorkspaces(): Promise<{
  added: string[];
  removed: string[];
  updated: string[];
}> {
  // Implementation to find workspaces on disk and reconcile with registry
}

/**
 * Rescan for orphaned workspaces
 */
async detectOrphanedWorkspaces(): Promise<string[]> {
  // Implementation to find directories that look like workspaces but aren't registered
}
```

## Implementation Plan

1. **Add Lifecycle Management**:
   - Implement cleanup methods for all managers
   - Add dependency-aware initialization and cleanup
   - Implement health/status reporting

2. **Create Database Connection Pool**:
   - Implement shared connection pool
   - Modify SessionManager to use pool
   - Add connection sharing logic

3. **Enhance Error Handling**:
   - Improve error categorization
   - Add recovery strategies
   - Implement better logging

4. **Add Workspace Locking**:
   - Implement lock manager
   - Add locking to critical operations
   - Implement lock timeouts and recovery

5. **Implement Synchronization**:
   - Add workspace registry synchronization
   - Implement orphaned workspace detection
   - Add consistency validation