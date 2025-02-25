/**
 * Utility for managing temporary test directories
 */
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export interface TestDirectory {
  path: string;
  cleanup: () => Promise<void>;
}

/**
 * Creates a temporary directory for testing
 * @param prefix Optional prefix for the directory name
 * @returns Object with path and cleanup function
 */
export async function createTestDirectory(prefix = 'mandrake-test-'): Promise<TestDirectory> {
  const testDirPath = await mkdtemp(join(tmpdir(), prefix));
  
  return {
    path: testDirPath,
    cleanup: async () => {
      await rm(testDirPath, { recursive: true, force: true });
    }
  };
}
