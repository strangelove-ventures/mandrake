import { expect, test, describe, beforeEach } from 'bun:test';
import { createDirectory } from '../../src/tools';
import { join } from 'path';
import { mkdir, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import type { Context } from '../../src/types';

interface DirectoryResult {
  path: string;
  success: boolean;
  error?: string;
}

describe('create_directory tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let allowedDirs: string[];
  let context: Context;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    allowedDirs = [testDir];
    await mkdir(testDir, { recursive: true });
    context = {};
  });

  test('creates new directory successfully', async () => {
    const newDir = join(testDir, 'new-dir');

    const result = await createDirectory.execute({
      path: newDir,
      allowedDirs
    }, context);

    // Check result
    const parsed = parseJsonResult<DirectoryResult>(result);
    expect(parsed?.success).toBe(true);

    // Verify directory was created
    const stats = await stat(newDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('creates nested directories successfully', async () => {
    const deepDir = join(testDir, 'deep', 'nested', 'dir');

    const result = await createDirectory.execute({
      path: deepDir,
      allowedDirs
    }, context);

    const parsed = parseJsonResult<DirectoryResult>(result);
    expect(parsed?.success).toBe(true);

    const stats = await stat(deepDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('succeeds if directory already exists', async () => {
    const existingDir = join(testDir, 'existing');
    await mkdir(existingDir);

    const result = await createDirectory.execute({
      path: existingDir,
      allowedDirs
    }, context);

    const parsed = parseJsonResult<DirectoryResult>(result);
    expect(parsed?.success).toBe(true);

    const stats = await stat(existingDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('handles directory outside allowed directories', async () => {
    const outsideDir = join(testRoot, 'outside');

    const result = await createDirectory.execute({
      path: outsideDir,
      allowedDirs
    }, context);

    const parsed = parseJsonResult<DirectoryResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBeDefined();

    // Verify directory wasn't created
    await expect(stat(outsideDir)).rejects.toThrow();
  });
});