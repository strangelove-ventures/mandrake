# Workspace Package Implementation Plan

## Overview

The workspace package manages interactions with workspaces on disk. Each workspace is a self-contained unit with configuration, source code, and sessions. This implementation plan focuses on core functionality without file watching (to be added later).

## Directory Structure

```
workspace/
├── src/
│   ├── types/
│   │   ├── index.ts               # Re-exports
│   │   └── schemas/               # Zod schemas
│   │       ├── workspace.ts       # Workspace schema
│   │       ├── tools.ts          # Tools config schema
│   │       ├── models.ts         # Models config schema
│   │       ├── dynamic.ts        # Dynamic context schema
│   │       └── prompt.ts         # System prompt schema
│   ├── managers/
│   │   ├── index.ts              # Re-exports
│   │   ├── workspace.ts          # WorkspaceConfigManager implementation
│   │   ├── dynamic.ts            # DynamicContextManager implementation
│   │   ├── files.ts             # FilesManager implementation
│   │   ├── models.ts            # ModelManager implementation
│   │   ├── prompt.ts            # PromptManager implementation
│   │   ├── tools.ts             # ToolsManager implementation
│   │   └── session.ts           # SessionManager stub
│   ├── session/                  # Session management code
│   │   ├── index.ts             # Re-exports
│   │   ├── types.ts             # Session types
│   │   └── db.ts                # Database interactions
│   ├── utils/
│   │   ├── index.ts             # Re-exports
│   │   └── paths.ts             # Path handling utilities
│   └── index.ts                 # Main exports and WorkspaceManager
└── tests/
    ├── managers/                # Tests for each manager
    └── workspace.test.ts        # Main WorkspaceManager tests
```

## Core Types

```typescript
// Base workspace types
interface Workspace {
  id: string;
  name: string;
  description?: string;
  created: string;
}

// Server configuration from MCP
interface ServerConfig {
  id: string;
  name: string;
  image: string;
  command?: string[];
  execCommand?: string[];
  volumes?: {
    source: string;
    target: string;
    mode: 'ro' | 'rw';
  }[];
}

// Configuration files
interface ToolsConfig {
  tools: ServerConfig[];
}

interface ModelsConfig {
  provider: string;
  apiKey?: string;
  baseURL?: string;
  maxTokens: number;
  temperature: number;
}

interface DynamicContextMethodConfig {
  id: string;
  serverId: string;
  methodName: string;
  params: Record<string, any>;
  refresh: {
    enabled: boolean;
    interval?: string;
    onDemand?: boolean;
  };
}

interface ContextConfig {
  dynamicContexts: DynamicContextMethodConfig[];
}
```

## Interfaces

### WorkspaceManager

```typescript
interface WorkspaceManager {
  config: WorkspaceConfigManager;
  dynamic: DynamicContextManager;
  files: FilesManager;
  models: ModelManager;
  prompt: PromptManager;
  session: SessionManager;
  tools: ToolsManager;
}
```

### WorkspaceConfigManager

```typescript
interface WorkspaceConfigManager {
  create(name: string, description?: string): Promise<Workspace>;
  list(): Promise<Workspace[]>;
  get(name: string): Promise<Workspace>;
  delete(name: string): Promise<void>;
  ensureDirectories(name: string): Promise<void>;
}
```

### DynamicContextManager

```typescript
interface DynamicContextManager {
  list(): Promise<DynamicContextMethodConfig[]>;
  get(id: string): Promise<DynamicContextMethodConfig>;
  create(config: Omit<DynamicContextMethodConfig, 'id'>): Promise<DynamicContextMethodConfig>;
  update(id: string, config: Partial<DynamicContextMethodConfig>): Promise<DynamicContextMethodConfig>;
  delete(id: string): Promise<void>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
}
```

### FilesManager

```typescript
interface ContextFile {
  name: string;
  path: string;
  size: number;
  type: string;
}

interface FilesManager {
  list(): Promise<ContextFile[]>;
  read(name: string): Promise<string>;
  write(name: string, content: string): Promise<void>;
  delete(name: string): Promise<void>;
  getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  }>;
}
```

### ModelManager

```typescript
interface ModelManager {
  get(): Promise<ModelsConfig>;
  update(config: Partial<ModelsConfig>): Promise<ModelsConfig>;
}
```

### PromptManager

```typescript
interface PromptManager {
  get(): Promise<string>;
  update(content: string): Promise<void>;
}
```

### ToolsManager

```typescript
interface ToolsManager {
  list(): Promise<ServerConfig[]>;
  get(id: string): Promise<ServerConfig>;
  add(config: ServerConfig): Promise<void>;
  update(id: string, config: Partial<ServerConfig>): Promise<void>;
  remove(id: string): Promise<void>;
  resolveVolumes(tool: ServerConfig): ServerConfig;
}
```

## Implementation Phases

1. **Phase 1: Core Setup**
   - [x] Implement workspace types
   - [x] Create Zod schemas for each config type
   - [x] Implement path utilities
   - [x] Set up error types and handling
   - [x] Create WorkspaceConfigManager

2. **Phase 2: File Operations**
   - [x] Implement FilesManager with stats
   - [x] Add file validation
   - [x] Implement file error handling

3. **Phase 3: Configuration Management**
   - [x] Implement ModelManager
   - [x] Implement PromptManager
   - [x] Implement ToolsManager
   - [x] Add configuration validation

4. **Phase 4: Dynamic Context**
   - [x] Implement DynamicContextManager
   - [x] Add enable/disable persistence
   - [x] Add configuration validation

5. **Phase 5: Session Integration**
   - [ ] Create session types
   - [ ] Create database schema
   - [ ] Add SessionManager stub
   - [ ] Prepare for future implementation

## Testing Strategy

### Unit Tests

Each manager should have comprehensive unit tests:

- [ ] WorkspaceConfigManager tests
- [ ] FilesManager tests
- [ ] ModelManager tests
- [ ] PromptManager tests
- [ ] ToolsManager tests
- [ ] DynamicContextManager tests
- [ ] Path utility tests
- [ ] Schema validation tests

### Integration Tests

- [ ] Full workspace lifecycle test
- [ ] Configuration management test
- [ ] File operations test
- [ ] Tool configuration test
- [ ] Session stub test

## Future Enhancements

1. File Watching
   - [ ] Add file system watchers
   - [ ] Implement debouncing
   - [ ] Add configuration change events

2. Version Control
   - [ ] Add git repository integration
   - [ ] Implement src directory symlinking

3. Backup Management
   - [ ] Implement workspace backup
   - [ ] Add cloud storage support

## Dependencies

```json
{
  "dependencies": {
    "@mandrake/utils": "workspace:*",
    "zod": "^3.22.4",
    "knex": "^3.1.0",
    "better-sqlite3": "^9.4.0"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/better-sqlite3": "^9.4.0",
    "typescript": "^5.0.0"
  }
}
```

## Notes

- All file operations should be asynchronous
- Each type should have its own Zod schema
- Each manager should use the logger from @mandrake/utils
- SessionManager implementation will be detailed separately
- Error messages should be user-friendly
- Each manager should be independently testable
