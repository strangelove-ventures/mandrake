// create_directory.test.ts
import { expect, test, describe, beforeEach } from 'bun:test';
import { createDirectory, CreateDirectoryParams } from '../../src/tools/create_directory';
import { join } from 'path';
import { mkdir, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import { createTestContext } from '../utils/test-utils';
import type { Tool } from '../../src/fastmcp';

interface DirectoryResult {
  path: string;
  success: boolean;
  error?: string;
}

describe('create_directory tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let createDirTool: Tool<typeof CreateDirectoryParams>;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    await mkdir(testDir, { recursive: true });

    // Create directory tool with security context
    createDirTool = createDirectory({
      allowedDirs: [testDir],
      excludePatterns: []
    });
  });

  test('creates new directory successfully', async () => {
    const newDir = join(testDir, 'new-dir');

    const result = await createDirTool.execute({
      path: newDir
    }, createTestContext());

    // Check result
    const parsed = parseJsonResult<DirectoryResult>(result);
    expect(parsed?.success).toBe(true);

    // Verify directory was created
    const stats = await stat(newDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('creates nested directories successfully', async () => {
    const deepDir = join(testDir, 'deep', 'nested', 'dir');

    const result = await createDirTool.execute({
      path: deepDir
    }, createTestContext());

    const parsed = parseJsonResult<DirectoryResult>(result);
    expect(parsed?.success).toBe(true);

    const stats = await stat(deepDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('succeeds if directory already exists', async () => {
    const existingDir = join(testDir, 'existing');
    await mkdir(existingDir);

    const result = await createDirTool.execute({
      path: existingDir
    }, createTestContext());

    const parsed = parseJsonResult<DirectoryResult>(result);
    expect(parsed?.success).toBe(true);

    const stats = await stat(existingDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('handles directory outside allowed directories', async () => {
    const outsideDir = join(testRoot, 'outside');

    const result = await createDirTool.execute({
      path: outsideDir
    }, createTestContext());

    const parsed = parseJsonResult<DirectoryResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBeDefined();

    // Verify directory wasn't created
    await expect(stat(outsideDir)).rejects.toThrow();
  });

  test('respects exclude patterns', async () => {
    const hiddenDir = join(testDir, '.hidden');

    // Create a new tool with exclude patterns
    const restrictedTool = createDirectory({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const result = await restrictedTool.execute({
      path: hiddenDir
    }, createTestContext());

    const parsed = parseJsonResult<DirectoryResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBe('Path matches exclude pattern');

    // Verify directory wasn't created
    await expect(stat(hiddenDir)).rejects.toThrow();
  });
});