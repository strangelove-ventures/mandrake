# SessionManager Service Documentation

This document provides detailed documentation of the SessionManager service, focusing on its SQLite database management, initialization requirements, and lifecycle considerations.

## Service Overview

The SessionManager is responsible for:

- Managing session data persistence using SQLite
- Providing CRUD operations for sessions, rounds, requests, responses, and turns
- Tracking streaming session state
- Supporting real-time updates through listeners

## Initialization Requirements

### Configuration Parameters

- **dbPath** (required): Absolute filesystem path to the SQLite database file
  - For system-level: `~/.mandrake/db.sqlite`
  - For workspaces: `~/{workspace_path}/.ws/db.sqlite`

### Filesystem Requirements

- Parent directory must exist or be created during initialization
- Write access to the directory for creating database files
- Sufficient disk space for database files
- Ability to create `-shm` and `-wal` files alongside the main database file

### Initialization Process

1. **Directory Creation**:

   ```typescript
   await mkdir(dirname(this.dbPath), { recursive: true });
   ```

2. **SQLite Connection Setup**:

   ```typescript
   this.sqlite = new Database(this.dbPath);
   this.sqlite.exec('PRAGMA journal_mode = WAL;');
   this.sqlite.exec('PRAGMA foreign_keys = ON;');
   ```

3. **Drizzle ORM Setup**:

   ```typescript
   this.db = drizzle(this.sqlite, { schema });
   ```

4. **Schema Migration**:

   ```typescript
   await migrate(this.db, {
     migrationsFolder: join(__dirname, MIGRATIONS_PATH),
   });
   ```

### Error Handling During Initialization

- Directory creation failure: Fails with "Failed to create database directory" error
- Database initialization failure: Fails with "Failed to initialize database" error
- Migration failure: Fails with "Failed to run migrations" error

### State After Initialization

- `this.initialized` set to `true`
- Active SQLite connection established
- ORM initialized with schema
- Migrations applied
- Ready to handle database operations

## Persistence Considerations

### SQLite Database Files

The SessionManager creates three files for each database:

- **Main database file**: `{dbPath}`
- **Shared memory file**: `{dbPath}-shm` (used for WAL mode)
- **Write-ahead log**: `{dbPath}-wal` (used for WAL mode)

### Locking Mechanisms

- **SQLite File Locks**: SQLite automatically manages file locks for concurrent access
- **WAL Mode**: Enables multiple readers with a single writer
- **Busy Timeout**: Not explicitly set (uses SQLite default)

### Concurrent Access Considerations

- **Multiple Processes**: WAL mode provides better concurrency between processes
- **Within API**: Only one connection per database file should be maintained to avoid lock conflicts
- **Connection Sharing**: Currently not implemented; each SessionManager creates its own connection

### Transaction Handling

- **Implicit Transactions**: Most operations use implicit transactions
- **Single-Statement Transactions**: Each database operation is typically its own transaction
- **No Explicit Transaction Blocks**: The code doesn't explicitly use BEGIN/COMMIT

## Cleanup Requirements

### Resources to Release

- **SQLite Connection**: Must be properly closed to release file locks
- **Turn Listeners**: Should be cleaned up to prevent memory leaks

### Cleanup Process

```typescript
async close(): Promise<void> {
  if (this.initialized) {
    this.logger.info(`Closing SessionManager for ${this.dbPath}`);
    this.sqlite.close();
    this.initialized = false;
  }
}
```

## Service Dependencies

### Required Dependencies

- **Filesystem Access**: Node.js fs/promises for directory operations
- **Bun SQLite**: Runtime dependency on Bun's SQLite implementation
- **Drizzle ORM**: For database operations
- **Schema Definitions**: Imports schema definitions from the workspace package

### Optional Dependencies

- **Logger**: Can be provided through utils package, defaults to internal logger

## Service Instantiation Patterns

### System-Level SessionManager

```typescript
// In MandrakeManager constructor
// The SessionManager is created by the mandrake manager
this.sessions = new SessionManager(paths.db);

// Later in init()
await this.sessions.init();
```

### Workspace-Level SessionManager

```typescript
// In WorkspaceManager constructor
// The SessionManager is created by the workspace manager
this.sessions = new SessionManager(paths.db);

// Later in init()
await this.sessions.init();
```

## Current Usage in API

### Initialization Context

- **System Level**: Created once in MandrakeManager constructor
- **Workspace Level**: Created once per workspace in WorkspaceManager constructor
- **No Connection Pooling**: Each SessionManager maintains its own database connection

### API Routes Usage

```typescript
// Getting the appropriate session manager for an operation
function getSessionManager(
  isSystem: boolean,
  managers: Managers,
  accessors: ManagerAccessors,
  workspaceId?: string,
  workspaceManager?: WorkspaceManager
): SessionManager {
  if (isSystem) {
    // For system sessions
    return managers.mandrakeManager.sessions;
  } else {
    // For workspace sessions
    let workspace: WorkspaceManager | undefined;
    
    if (workspaceManager && workspaceId) {
      // Use the provided workspace manager
      workspace = workspaceManager;
    } else {
      // Get workspace from managers
      const wsId = workspaceId!; // Needs to be provided in this case
      workspace = accessors.getWorkspaceManager(wsId);
      
      if (!workspace) {
        throw new Error(`Workspace ${wsId} not found`);
      }
    }
    
    return workspace.sessions;
  }
}
```

### Session Coordinator Integration

SessionCoordinator depends on SessionManager for:
- Creating and managing session data
- Tracking streaming turns
- Retrieving session history

```typescript
// In SessionCoordinator
const { response } = await this.opts.sessionManager.createRound({
  sessionId,
  content: requestContent
});

// Tracking turn updates
sessionManager.trackStreamingTurns(responseId, (turn) => {
  // Handle turn updates
});
```

## Known Issues and Limitations

1. **No Connection Pooling**: Each SessionManager creates its own SQLite connection, potentially leading to lock conflicts
2. **No Explicit Connection Closing**: No explicit cleanup during API shutdown
3. **Limited Transaction Support**: No explicit transaction blocks for multi-statement operations
4. **No Connection Timeout Handling**: No handling for connection timeouts or retries
5. **No Connection Health Monitoring**: No monitoring of database connection health

## Improvement Recommendations

### 1. Implement Connection Pooling

Create a DatabaseConnectionPool that:
- Manages a single connection per database file
- Uses reference counting for shared connections
- Provides proper cleanup on shutdown

```typescript
// Example implementation
class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool;
  private connections = new Map<string, {
    db: Database;
    refCount: number;
  }>();

  static getInstance(): DatabaseConnectionPool {
    if (!this.instance) {
      this.instance = new DatabaseConnectionPool();
    }
    return this.instance;
  }

  getConnection(path: string): Database {
    let conn = this.connections.get(path);
    
    if (!conn) {
      const db = new Database(path);
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA foreign_keys = ON;');
      
      conn = { db, refCount: 0 };
      this.connections.set(path, conn);
    }
    
    conn.refCount++;
    return conn.db;
  }

  releaseConnection(path: string): void {
    const conn = this.connections.get(path);
    if (conn) {
      conn.refCount--;
      if (conn.refCount <= 0) {
        conn.db.close();
        this.connections.delete(path);
      }
    }
  }

  closeAll(): void {
    for (const [path, conn] of this.connections.entries()) {
      conn.db.close();
    }
    this.connections.clear();
  }
}
```

### 2. Enhance Error Handling

Add robust error handling for database operations:
- Implement retry logic for temporary failures
- Add proper error categorization
- Provide detailed error messages with context

### 3. Add Transaction Support

Implement explicit transaction support:
- Add methods for transaction handling
- Use transactions for multi-statement operations
- Add proper rollback on error

### 4. Implement Connection Health Monitoring

Add database connection health monitoring:
- Periodic health checks
- Automatic reconnection on failure
- Status reporting

### 5. Add Connection Timeout Handling

Implement connection timeout handling:
- Set explicit busy timeout
- Add retry logic with exponential backoff
- Handle busy errors gracefully

## Implementation Plan

1. **Create Database Connection Pool**:
   - Implement singleton pattern
   - Add reference counting
   - Implement proper cleanup

2. **Update SessionManager**:
   - Modify to use connection pool
   - Add transaction support
   - Enhance error handling

3. **Implement Health Monitoring**:
   - Add health check methods
   - Implement status reporting
   - Add automatic recovery

4. **Update API Shutdown**:
   - Add proper cleanup for database connections
   - Implement graceful shutdown
   - Add error handling for cleanup