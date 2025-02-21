import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { tree } from '../../src/tools';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import type { Context } from '../../src/types';

interface TreeNode {
  type: 'file' | 'directory';
  name: string;
  path: string;
  children?: TreeNode[];
}

interface TreeResult {
  path: string;
  tree: TreeNode;
  error?: string;
}

describe('tree tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let allowedDirs: string[];
  let context: Context;
  let excludePatterns: string[];

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    allowedDirs = [testDir];
    excludePatterns = [];
    await mkdir(testDir, { recursive: true });
    context = {};
  });

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true });
  });

  test('shows empty directory structure', async () => {
    const result = await tree.execute({
      path: testDir,
      allowedDirs,
      depth: 3,
      excludePatterns
    }, context);

    const parsed = parseJsonResult<TreeResult>(result);
    expect(parsed?.tree.type).toBe('directory');
    expect(parsed?.tree.children).toHaveLength(0);
  });

  test('shows nested directory structure', async () => {
    // Create test structure
    await mkdir(join(testDir, 'dir1'));
    await mkdir(join(testDir, 'dir2'));
    await mkdir(join(testDir, 'dir1', 'nested'));
    await writeFile(join(testDir, 'file1.txt'), 'content');
    await writeFile(join(testDir, 'dir1', 'file2.txt'), 'content');
    await writeFile(join(testDir, 'dir1', 'nested', 'file3.txt'), 'content');

    const result = await tree.execute({
      path: testDir,
      allowedDirs,
      depth: 3,
      excludePatterns
    }, context);

    const parsed = parseJsonResult<TreeResult>(result);

    // Check root structure
    expect(parsed?.tree.type).toBe('directory');
    expect(parsed?.tree.children).toHaveLength(3); // dir1, dir2, file1.txt

    // Find dir1 and check its structure
    const dir1 = parsed?.tree.children?.find(c => c.name === 'dir1');
    expect(dir1).toBeDefined();
    expect(dir1?.type).toBe('directory');
    expect(dir1?.children).toHaveLength(2); // nested, file2.txt

    // Check nested directory
    const nested = dir1?.children?.find(c => c.name === 'nested');
    expect(nested).toBeDefined();
    expect(nested?.type).toBe('directory');
    expect(nested?.children).toHaveLength(1); // file3.txt
  });

  test('respects depth parameter', async () => {
    // Create deep structure
    await mkdir(join(testDir, 'dir1', 'nested1', 'nested2'), { recursive: true });
    await writeFile(join(testDir, 'dir1', 'nested1', 'nested2', 'deep.txt'), 'content');

    const result = await tree.execute({
      path: testDir,
      allowedDirs,
      depth: 2,
      excludePatterns
    }, context);

    const parsed = parseJsonResult<TreeResult>(result);

    // Navigate to nested1 and ensure it doesn't show deeper content
    const dir1 = parsed?.tree.children?.find(c => c.name === 'dir1');
    const nested1 = dir1?.children?.find(c => c.name === 'nested1');
    expect(nested1?.children).toBeUndefined();
  });

  test('handles directory outside allowed directories', async () => {
    const outsideDir = join(testRoot, 'outside');
    await mkdir(outsideDir);

    const result = await tree.execute({
      path: outsideDir,
      allowedDirs,
      depth: 3,
      excludePatterns
    }, context);

    const parsed = parseJsonResult<TreeResult>(result);
    expect(parsed?.error).toBeDefined();
  });

  test('handles non-existent directory', async () => {
    const nonexistentDir = join(testDir, 'nonexistent');

    const result = await tree.execute({
      path: nonexistentDir,
      allowedDirs,
      depth: 3,
      excludePatterns
    }, context);

    const parsed = parseJsonResult<TreeResult>(result);
    expect(parsed?.error).toBeDefined();
  });


  test('respects exclude patterns', async () => {
    // Create test structure including files to exclude
    await mkdir(join(testDir, '.ws'));
    await writeFile(join(testDir, '.ws', 'config.json'), 'content');
    await writeFile(join(testDir, 'file1.txt'), 'content');
    await writeFile(join(testDir, '.hidden'), 'content');
    await mkdir(join(testDir, 'dir1'));
    await writeFile(join(testDir, 'dir1', 'visible.txt'), 'content');
    await writeFile(join(testDir, 'dir1', '.hidden2'), 'content');

    const result = await tree.execute({
      path: testDir,
      allowedDirs,
      excludePatterns: ['^\\.'],
      depth: Infinity
    }, context);

    const parsed = parseJsonResult<TreeResult>(result);
    expect(parsed?.tree.type).toBe('directory');

    // Should have 2 items at root (file1.txt and dir1)
    expect(parsed?.tree.children).toHaveLength(2);

    // Find dir1 and check its contents
    const dir1 = parsed?.tree.children?.find(c => c.name === 'dir1');
    expect(dir1?.type).toBe('directory');
    // Should only have visible.txt, not .hidden2
    expect(dir1?.children).toHaveLength(1);
    expect(dir1?.children?.[0].name).toBe('visible.txt');

    // Verify .ws directory and its contents are excluded
    const hiddenItems = parsed?.tree.children?.filter(c => c.name.startsWith('.'));
    expect(hiddenItems).toHaveLength(0);
  });
});