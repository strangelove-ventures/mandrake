import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import Database from 'bun:sqlite';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import * as schema from '../../src/session/db/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type TestDb = {
  sqlite: Database;
  db: ReturnType<typeof drizzle>;
  path: string;
  cleanup: () => Promise<void>;
};

export async function createTestDb(dbName = 'test.db'): Promise<TestDb> {
  // Create SQLite database with WAL mode and foreign keys enabled
  const sqlite = new Database(dbName);
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  
  // Create drizzle instance with query preparation enabled
  const db = drizzle(sqlite, { schema });

  // Run migrations
  await migrate(db, {
    migrationsFolder: __dirname + '/../../src/session/db/migrations',
  });

  return {
    sqlite,
    db,
    path: dbName,
    cleanup: async () => {
      sqlite.close();
      await Bun.file(dbName).delete();
      // Also remove WAL files
      await Bun.file(dbName + '-shm').delete().catch(() => {});
      await Bun.file(dbName + '-wal').delete().catch(() => {});
    }
  };
}

// Helper to create a session with basic data for testing
export async function createTestSession(db: TestDb['db'], opts?: {
  title?: string;
  description?: string;
  workspaceId?: string;
}) {
  const session = await db.insert(schema.sessions)
    .values({
      title: opts?.title,
      description: opts?.description,
      workspaceId: opts?.workspaceId,
      metadata: '{}' // Ensure we set default JSON
    })
    .returning()
    .get(); // Get single row instead of array

  return session;
}

// Helper to simulate a streaming turn
export async function createStreamingTurn(db: TestDb['db'], responseId: string, content: string[]) {
  const turn = await db.insert(schema.turns)
    .values({
      responseId,
      index: 0,
      rawResponse: content.join('\n'),
      content: JSON.stringify(content),
      toolCalls: '[]',
      status: 'streaming',
      inputTokens: 0,
      outputTokens: 0,
      inputCost: 0,
      outputCost: 0,
    })
    .returning()
    .get(); // Get single row instead of array

  return turn;
}