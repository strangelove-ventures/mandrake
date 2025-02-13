import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import Database from 'bun:sqlite';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __dirname = dirname(fileURLToPath(import.meta.url));

// Create/connect db
const sqlite = new Database('db.sqlite');
const db = drizzle(sqlite);

// Run migrations
await migrate(db, {
  migrationsFolder: __dirname + '/migrations',
});

console.log('Migrations completed');