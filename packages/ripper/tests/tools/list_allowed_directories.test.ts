import { expect, test, describe, beforeEach } from 'bun:test';
import { listAllowedDirectories } from '../../src/tools';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import type { Context } from '../../src/types';

interface DirectoryInfo {
  path: string;
  exists: boolean;
  error?: string;
}

interface ListDirectoriesResult {
  directories: DirectoryInfo[];
}

describe('list_allowed_directories tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDirs: string[];
  let context: Context;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDirs = [
      join(testRoot, 'dir1'),
      join(testRoot, 'dir2'),
      join(testRoot, 'dir3')
    ];

    // Create test directories
    for (const dir of testDirs) {
      await mkdir(dir, { recursive: true });
    }
    context = {};
  });

  test('lists all existing directories', async () => {
    const result = await listAllowedDirectories.execute({
      allowedDirs: testDirs
    }, context);

    const parsed = parseJsonResult<ListDirectoriesResult>(result);
    expect(parsed?.directories).toHaveLength(testDirs.length);

    for (const dir of parsed?.directories ?? []) {
      expect(dir.exists).toBe(true);
      expect(dir.error).toBeUndefined();
    }
  });

  test('handles non-existent directories', async () => {
    const nonexistentDir = join(testRoot, 'nonexistent');
    const dirs = [...testDirs, nonexistentDir];

    const result = await listAllowedDirectories.execute({
      allowedDirs: dirs
    }, context);

    const parsed = parseJsonResult<ListDirectoriesResult>(result);
    expect(parsed?.directories).toHaveLength(dirs.length);

    const nonexistent = parsed?.directories.find(d => d.path === nonexistentDir);
    expect(nonexistent?.exists).toBe(false);
    expect(nonexistent?.error).toBeDefined();
  });

  test('handles file paths', async () => {
    const filePath = join(testRoot, 'file.txt');
    await writeFile(filePath, 'test');

    const result = await listAllowedDirectories.execute({
      allowedDirs: [...testDirs, filePath]
    }, context);

    const parsed = parseJsonResult<ListDirectoriesResult>(result);
    const file = parsed?.directories.find(d => d.path === filePath);
    expect(file?.exists).toBe(false);
    expect(file?.error).toContain('not a directory');
  });

  test('handles empty directory list', async () => {
    const result = await listAllowedDirectories.execute({
      allowedDirs: []
    }, context);

    const parsed = parseJsonResult<ListDirectoriesResult>(result);
    expect(parsed?.directories).toHaveLength(0);
  });
});