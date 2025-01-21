# Storage Implementation Plan

## Overview

Direct PostgreSQL database implementation for Mandrake, focusing on simplicity and type safety.

## Core Concepts

### 1. Type System

- Centralized types in @mandrake/types package
- Used by both database and application layers
- Provides type safety and consistency across packages

```typescript
// Example in @mandrake/types
export interface BaseRecord {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message extends BaseRecord {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
}
```

### 2. Schema Management

- One directory per table
- SQL schema files with table definitions
- Consistent timestamp handling via triggers
- No views/functions initially, but space to add them

```shell
tables/
  messages/
    schema.sql     # Table definition + triggers
    index.ts      # Repository implementation
  conversations/
  providers/
  models/
```

### 3. Migration System

- Simple but present from the start
- SQL-based migrations with up/down support
- Timestamp-based ordering
- Transaction safety

```shell
migrations/
  versions/
    20250119_initial_schema.sql
    20250119_add_tool_configs.sql
  manager.ts    # Migration management
  types.ts      # Migration interfaces
```

### 4. Repository Pattern

- Type-safe repositories for each table
- Basic CRUD operations
- Transaction support
- Connection pooling

## Directory Structure

```shell
packages/storage/
├── src/
│   ├── connection/
│   │   ├── index.ts       # Connection management
│   │   └── pool.ts        # Pool configuration
│   │
│   ├── migrations/
│   │   ├── versions/      # SQL migration files
│   │   ├── manager.ts     # Migration logic
│   │   └── types.ts       # Migration interfaces
│   │
│   ├── tables/           # One directory per table
│   │   ├── messages/
│   │   ├── conversations/
│   │   ├── providers/
│   │   └── models/
│   │
│   └── cli.ts            # CLI for migrations
│
└── tests/               # Integration tests
```

## Implementation Phases

### Phase 1: Foundation

1. Core type definitions in @mandrake/types
2. Database connection management
3. Basic schema files for core tables
4. Migration system implementation

### Phase 2: Core Functionality

1. Repository implementations
2. Transaction handling
3. Error management
4. Basic integration tests

### Phase 3: Tool Integration

1. MCP tool schemas
2. Tool configuration storage
3. Tool result logging
4. Additional repository methods as needed

## Common Table Pattern

Every table follows this pattern:

1. Extends BaseRecord (id, timestamps)
2. Has create/update timestamp trigger
3. Has type definition in @mandrake/types
4. Has repository with standard CRUD

## Initial Tables

```sql
-- Common pattern for all tables
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- table specific columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
```

Core tables:

- conversations
- messages
- providers
- models
- tool_configs
- tool_results

## Development Workflow

1. Define types in @mandrake/types
2. Create new migration if changing schema
3. Implement repository methods
4. Add integration tests

## Testing Strategy

1. Integration tests with real PostgreSQL
2. Repository method testing
3. Migration testing
4. Transaction testing

## Future Considerations

1. Query analysis/logging
2. Additional tool storage needs
3. Backup/restore procedures
4. Analytics requirements
