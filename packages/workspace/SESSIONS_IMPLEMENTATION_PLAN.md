# Session Management Implementation Plan

## Overview

The session management system handles chat interactions in both workspaces and the root mandrake application. It provides:

- Database operations for sessions, rounds, turns
- Token and cost tracking
- Real-time update streaming (TBD)
- Validation with Zod schemas

## Directory Structure

```
workspace/
├── src/
│   ├── types/
│   │   ├── workspace/           # Existing workspace schemas
│   │   └── session/
│   │       ├── index.ts        # Type re-exports
│   │       ├── metrics.ts      # Token metrics schema
│   │       ├── session.ts      # Session schema
│   │       ├── round.ts        # Round & Request/Response schemas
│   │       └── turn.ts         # Turn schema
│   └── session/
│       ├── db/
│       │   ├── config.ts       # Knex configuration
│       │   ├── migrations/     # Knex migrations (TBD)
│       │   ├── operations.ts   # Low-level database operations
│       │   └── queries.ts      # Common SQL queries
│       ├── manager.ts          # SessionManager implementation
│       └── events.ts           # Event handling (TBD)
```

## Core Types & Schemas

```typescript
// src/session/types/schemas/metrics.ts
export const tokenMetricsSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative().optional(),
  cacheWriteTokens: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative()
});

export type TokenMetrics = z.infer<typeof tokenMetricsSchema>;

// src/session/types/schemas/session.ts
export const sessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  workspaceId: z.string().optional(),
  metadata: z.record(z.string(), z.string()),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Session = z.infer<typeof sessionSchema>;

// src/session/types/schemas/round.ts
export const roundSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  requestId: z.string().uuid(),
  responseId: z.string().uuid(),
  index: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Round = z.infer<typeof roundSchema>;

export const requestSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Request = z.infer<typeof requestSchema>;

export const responseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Response = z.infer<typeof responseSchema>;

// src/session/types/schemas/turn.ts
export const turnToolCallSchema = z.object({
  call: z.any(),  // Will be typed based on MCP implementation
  result: z.any()
});

export const turnSchema = z.object({
  id: z.string().uuid(),
  responseId: z.string().uuid(),
  index: z.number().int().nonnegative(),
  rawResponse: z.string(),
  content: z.array(z.string()),
  toolCalls: z.array(turnToolCallSchema),
  metrics: tokenMetricsSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Turn = z.infer<typeof turnSchema>;

// Event types for real-time updates
export const sessionEventSchema = z.object({
  type: z.enum(['created', 'updated', 'deleted']),
  session: sessionSchema
});

export type SessionEvent = z.infer<typeof sessionEventSchema>;

export const turnEventSchema = z.object({
  type: z.enum(['created', 'updated']),
  turn: turnSchema
});

export type TurnEvent = z.infer<typeof turnEventSchema>;
```

## Public API

### SessionManager

```typescript
class SessionManager {
  constructor(dbPath: string);

  // Session Operations
  async createSession(opts: { 
    workspaceId?: string;
    title?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Session>;
  
  async getSession(id: string): Promise<Session>;
  
  async listSessions(opts?: {
    workspaceId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Session[]>;
  
  async updateSession(id: string, updates: {
    title?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Session>;
  
  async deleteSession(id: string): Promise<void>;

  // Round Operations
  async startRound(opts: {
    sessionId: string;
    content: string;  // User request content
  }): Promise<Round>;

  async getCurrentRound(sessionId: string): Promise<Round | null>;

  // Turn Operations
  async addTurn(opts: {
    responseId: string;
    rawResponse: string;
    content?: string[];
    toolCalls?: {
      call: any;
      result: any;
    }[];
    metrics: TokenMetrics;
  }): Promise<Turn>;

  async getLatestTurn(responseId: string): Promise<Turn | null>;

  // Metrics & Analytics
  async getSessionMetrics(sessionId: string): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheReadTokens: number;
    totalCacheWriteTokens: number;
    totalCost: number;
    roundCount: number;
    turnCount: number;
    averageTurnsPerRound: number;
  }>;

  // Event Handling (TBD)
  onSessionEvent(callback: (event: SessionEvent) => void): void;
  onTurnEvent(callback: (event: TurnEvent) => void): void;
}
```

## Implementation Phases

1. **Schema and Validation**
   - [ ] Implement Zod schemas for all types
   - [ ] Add validation utilities
   - [ ] Add schema tests

2. **Database Setup**
   - [ ] Create Knex configuration module
   - [ ] Create schema initialization function
   - [ ] Add basic create/read operations
   - [ ] Add update/delete operations
   - [ ] Add transaction support

3. **Session Manager Core**
   - [ ] Implement session CRUD operations
   - [ ] Add round management
   - [ ] Add turn tracking with raw response storage
   - [ ] Add metrics calculations
   - [ ] Add error handling

4. **Real-time Updates (TBD)**
   - [ ] Research SQLite change notification options
   - [ ] Design event system
   - [ ] Implement chosen solution
   - [ ] Add documentation

5. **Testing**
   - [ ] Schema validation tests
   - [ ] Database operation tests
   - [ ] Session manager tests
   - [ ] Metrics calculation tests
   - [ ] Event system tests

## Database Details

### Schema Initialization

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  workspace_id TEXT,
  metadata JSON NOT NULL DEFAULT '{}',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  request_id TEXT UNIQUE NOT NULL,
  response_id TEXT UNIQUE NOT NULL,
  index INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE responses (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE turns (
  id TEXT PRIMARY KEY,
  response_id TEXT NOT NULL,
  index INTEGER NOT NULL,
  raw_response TEXT NOT NULL,
  content JSON,  -- Array of strings
  tool_calls JSON,  -- Array of {call, result} objects
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cache_read_tokens INTEGER,
  cache_write_tokens INTEGER,
  cost REAL NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE
);

-- Indexes for foreign keys and common queries
CREATE INDEX idx_rounds_session_id ON rounds(session_id);
CREATE INDEX idx_turns_response_id ON turns(response_id);
CREATE INDEX idx_sessions_workspace_id ON sessions(workspace_id);
```

### Common Queries

```typescript
// src/utils/queries.ts

export const sessionMetricsQuery = `
  SELECT
    SUM(t.input_tokens) as total_input_tokens,
    SUM(t.output_tokens) as total_output_tokens,
    SUM(t.cache_read_tokens) as total_cache_read_tokens,
    SUM(t.cache_write_tokens) as total_cache_write_tokens,
    SUM(t.cost) as total_cost,
    COUNT(DISTINCT r.id) as round_count,
    COUNT(t.id) as turn_count,
    CAST(COUNT(t.id) AS FLOAT) / COUNT(DISTINCT r.id) as avg_turns_per_round
  FROM sessions s 
  LEFT JOIN rounds r ON r.session_id = s.id
  LEFT JOIN responses res ON res.id = r.response_id
  LEFT JOIN turns t ON t.response_id = res.id
  WHERE s.id = ?
  GROUP BY s.id
`;
```

## Next Steps

1. Start with schema and validation implementation
2. Implement database setup with schema
3. Build core SessionManager with validation
4. Research real-time update options

## Notes

- All database operations should use transactions where appropriate
- Consider using prepared statements for frequent queries
- Need to handle the case where a turn is incomplete (streaming)
- Consider periodic cleanup of old sessions
- Documentation needed for all public APIs
- Validate all inputs with Zod schemas before database operations
- Raw LLM responses stored separately from processed content
- Tool calls and content stored as arrays for flexibility
