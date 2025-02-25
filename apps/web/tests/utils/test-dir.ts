/**
 * Utilities for managing temporary test directories
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Creates a temporary directory for testing
 * @returns The path to the temporary directory
 */
export async function createTempDir(): Promise<string> {
  return await mkdtemp(join(tmpdir(), 'mandrake-test-'));
}

/**
 * Cleans up a temporary directory
 * @param path The path to clean up
 */
export async function cleanupTempDir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

/**
 * Object-based test directory utility (alternative approach)
 */
export interface TestDirectory {
  path: string;
  cleanup: () => Promise<void>;
}

/**
 * Creates a temporary directory for testing with an object interface
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
