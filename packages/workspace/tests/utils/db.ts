import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from '../../src/managers/session';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type TestDb = {
  path: string;
  manager: SessionManager;
  cleanup: () => Promise<void>;
};

export async function createTestDb(dbName = 'test.db'): Promise<TestDb> {
  const manager = new SessionManager(dbName);

  await manager.init();
  
  return {
    path: dbName,
    manager,
    cleanup: async () => {
      await manager.close();
      await Bun.file(dbName).delete();
      // Also remove WAL files
      await Bun.file(dbName + '-shm').delete().catch(() => { });
      await Bun.file(dbName + '-wal').delete().catch(() => { });
    }
  };
}