// list_directory.test.ts
import { expect, test, describe, beforeEach } from 'bun:test';
import { listDirectory, ListDirectoryParams } from '../../src/tools/list_directory';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import { createTestContext } from '../utils/test-utils';
import type { Tool } from '../../src/fastmcp';

interface DirectoryItem {
  type: 'FILE' | 'DIR';
  name: string;
  path: string;
}

interface ListDirectoryResult {
  path: string;
  items: DirectoryItem[];
  error?: string;
}

describe('list_directory tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let listTool: Tool<typeof ListDirectoryParams>;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    await mkdir(testDir, { recursive: true });

    // Create list directory tool with security context
    listTool = listDirectory({
      allowedDirs: [testDir],
      excludePatterns: []
    });
  });

  test('lists empty directory', async () => {
    const result = await listTool.execute({
      path: testDir
    }, createTestContext());

    const parsed = parseJsonResult<ListDirectoryResult>(result);
    expect(parsed?.items).toHaveLength(0);
  });

  test('lists files and directories', async () => {
    // Create test structure
    await writeFile(join(testDir, 'file1.txt'), 'content');
    await writeFile(join(testDir, 'file2.txt'), 'content');
    await mkdir(join(testDir, 'dir1'));
    await mkdir(join(testDir, 'dir2'));

    const result = await listTool.execute({
      path: testDir
    }, createTestContext());

    const parsed = parseJsonResult<ListDirectoryResult>(result);
    expect(parsed?.items).toHaveLength(4);

    // Verify directories are listed first
    expect(parsed?.items[0].type).toBe('DIR');
    expect(parsed?.items[1].type).toBe('DIR');
    expect(parsed?.items[2].type).toBe('FILE');
    expect(parsed?.items[3].type).toBe('FILE');

    // Verify alphabetical ordering within types
    expect(parsed?.items[0].name).toBe('dir1');
    expect(parsed?.items[1].name).toBe('dir2');
    expect(parsed?.items[2].name).toBe('file1.txt');
    expect(parsed?.items[3].name).toBe('file2.txt');
  });

  test('handles directory outside allowed directories', async () => {
    const outsideDir = join(testRoot, 'outside');
    await mkdir(outsideDir);

    const result = await listTool.execute({
      path: outsideDir
    }, createTestContext());

    const parsed = parseJsonResult<ListDirectoryResult>(result);
    expect(parsed?.error).toBeDefined();
  });

  test('handles non-existent directory', async () => {
    const nonexistentDir = join(testDir, 'nonexistent');

    const result = await listTool.execute({
      path: nonexistentDir
    }, createTestContext());

    const parsed = parseJsonResult<ListDirectoryResult>(result);
    expect(parsed?.error).toBeDefined();
  });

  test('respects exclude patterns', async () => {
    // Create test structure including files to exclude
    await writeFile(join(testDir, 'file1.txt'), 'content');
    await writeFile(join(testDir, '.hidden'), 'content');
    await mkdir(join(testDir, 'dir1'));
    await mkdir(join(testDir, '.ws'));

    // Create a new tool with exclude patterns
    const restrictedTool = listDirectory({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const result = await restrictedTool.execute({
      path: testDir
    }, createTestContext());

    const parsed = parseJsonResult<ListDirectoryResult>(result);
    expect(parsed?.items).toHaveLength(2); // Should only see file1.txt and dir1

    const names = parsed?.items.map(item => item.name);
    expect(names).toContain('file1.txt');
    expect(names).toContain('dir1');
    expect(names).not.toContain('.hidden');
    expect(names).not.toContain('.ws');
  });
});