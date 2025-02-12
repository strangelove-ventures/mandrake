import { createLogger } from '@mandrake/utils';
import Database from 'better-sqlite3';
import { knex, type Knex } from 'knex';

const logger = createLogger('workspace').child({
  meta: { component: 'session-db' }
});

export interface DatabaseConfig {
  path: string;
}

// Initialize Knex with SQLite and better-sqlite3
export function createKnexInstance(config: DatabaseConfig): Knex {
  return knex({
    client: 'better-sqlite3',
    connection: {
      filename: config.path
    },
    useNullAsDefault: true,
    // SQLite-specific configuration
    pool: {
      afterCreate: (conn: Database, done: Function) => {
        // Enable foreign keys
        conn.exec('PRAGMA foreign_keys = ON;');
        // Enable WAL mode for better concurrency
        conn.exec('PRAGMA journal_mode = WAL;');
        done();
      },
      min: 1,
      max: 1
    },
    debug: false,
    // Optional logging
    log: {
      warn(message) {
        logger.warn(message);
      },
      error(message) {
        logger.error(message);
      },
      deprecate(message) {
        logger.warn(message);
      },
      debug(message) {
        logger.debug(message);
      },
    }
  });
}

// SQL for creating tables
export const schema = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  workspace_id TEXT,
  metadata JSON NOT NULL DEFAULT '{}',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  request_id TEXT UNIQUE NOT NULL,
  response_id TEXT UNIQUE NOT NULL,
  index INTEGER NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS turns (
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
CREATE INDEX IF NOT EXISTS idx_rounds_session_id ON rounds(session_id);
CREATE INDEX IF NOT EXISTS idx_turns_response_id ON turns(response_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace_id ON sessions(workspace_id);
`;

// Initialize database with schema
export async function initializeDatabase(db: Knex): Promise<void> {
  logger.info('Initializing database schema');
  await db.raw(schema);
  logger.info('Database schema initialized');
}

// Export types for table schemas
export interface DBSession {
  id: string;
  title?: string;
  description?: string;
  workspace_id?: string;
  metadata: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface DBRound {
  id: string;
  session_id: string;
  request_id: string;
  response_id: string;
  index: number;
  created_at: string;
  updated_at: string;
}

export interface DBRequest {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DBResponse {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface DBTurn {
  id: string;
  response_id: string;
  index: number;
  raw_response: string;
  content: string; // JSON string
  tool_calls: string; // JSON string
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  cost: number;
  created_at: string;
  updated_at: string;
}