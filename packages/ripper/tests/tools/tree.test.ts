import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { tree, TreeParams } from '../../src/tools/tree';
import { join } from 'path';
import { createTestContext } from '../utils/test-utils';
import { mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import type { Tool } from '../../src/fastmcp';

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
  let treeTool: Tool<typeof TreeParams>;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    await mkdir(testDir, { recursive: true });

    // Create tree tool with security context
    treeTool = tree({
      allowedDirs: [testDir],
      excludePatterns: []
    });
  });

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true });
  });

  test('shows empty directory structure', async () => {
    const result = await treeTool.execute({
      path: testDir,
      depth: 3
    }, createTestContext());

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

    const result = await treeTool.execute({
      path: testDir,
      depth: 3
    }, createTestContext());

    const parsed = parseJsonResult<TreeResult>(result);

    // Check root structure
    expect(parsed?.tree.type).toBe('directory');
    expect(parsed?.tree.children).toHaveLength(3);

    // Find dir1 and check its structure
    const dir1 = parsed?.tree.children?.find(c => c.name === 'dir1');
    expect(dir1).toBeDefined();
    expect(dir1?.type).toBe('directory');
    expect(dir1?.children).toHaveLength(2);

    // Check nested directory
    const nested = dir1?.children?.find(c => c.name === 'nested');
    expect(nested).toBeDefined();
    expect(nested?.type).toBe('directory');
    expect(nested?.children).toHaveLength(1);
  });

  test('respects depth parameter', async () => {
    // Create deep structure
    await mkdir(join(testDir, 'dir1', 'nested1', 'nested2'), { recursive: true });
    await writeFile(join(testDir, 'dir1', 'nested1', 'nested2', 'deep.txt'), 'content');

    const result = await treeTool.execute({
      path: testDir,
      depth: 2
    }, createTestContext());

    const parsed = parseJsonResult<TreeResult>(result);

    // Navigate to nested1 and ensure it doesn't show deeper content
    const dir1 = parsed?.tree.children?.find(c => c.name === 'dir1');
    const nested1 = dir1?.children?.find(c => c.name === 'nested1');
    expect(nested1?.children).toBeUndefined();
  });

  test('handles directory outside allowed directories', async () => {
    const outsideDir = join(testRoot, 'outside');
    await mkdir(outsideDir);

    const result = await treeTool.execute({
      path: outsideDir,
      depth: 3
    }, createTestContext());

    const parsed = parseJsonResult<TreeResult>(result);
    expect(parsed?.error).toBeDefined();
  });

  test('handles non-existent directory', async () => {
    const nonexistentDir = join(testDir, 'nonexistent');

    const result = await treeTool.execute({
      path: nonexistentDir,
      depth: 3
    }, createTestContext());

    const parsed = parseJsonResult<TreeResult>(result);
    expect(parsed?.error).toBeDefined();
  });

  test('respects exclude patterns', async () => {
    // Create test structure including files to exclude
    const hiddenDir = join(testDir, '.hidden');
    await mkdir(hiddenDir);
    await writeFile(join(hiddenDir, 'config.json'), 'content');
    await writeFile(join(testDir, 'file1.txt'), 'content');
    await writeFile(join(testDir, '.hidden.txt'), 'content');
    await mkdir(join(testDir, 'dir1'));
    await writeFile(join(testDir, 'dir1', 'visible.txt'), 'content');
    await writeFile(join(testDir, 'dir1', '.hidden2.txt'), 'content');

    // Create a new tool with exclude patterns
    const restrictedTool = tree({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const result = await restrictedTool.execute({
      path: testDir,
      depth: Infinity
    }, createTestContext());

    const parsed = parseJsonResult<TreeResult>(result);
    expect(parsed?.tree.type).toBe('directory');

    // Should have 2 items at root (file1.txt and dir1)
    expect(parsed?.tree.children).toHaveLength(2);

    // Find dir1 and check its contents
    const dir1 = parsed?.tree.children?.find(c => c.name === 'dir1');
    expect(dir1?.type).toBe('directory');
    // Should only have visible.txt, not .hidden2.txt
    expect(dir1?.children).toHaveLength(1);
    expect(dir1?.children?.[0].name).toBe('visible.txt');

    // Verify no hidden files/dirs are present
    const allPaths = getAllPaths(parsed?.tree);
    expect(allPaths.some(p => p.includes('/.hidden'))).toBe(false);
    expect(allPaths.some(p => p.includes('/.hidden.txt'))).toBe(false);
    expect(allPaths.some(p => p.includes('/.hidden2.txt'))).toBe(false);
  });
});

// Helper to get all paths in tree
function getAllPaths(node: TreeNode | undefined): string[] {
  if (!node) return [];

  const paths = [node.path];
  if (node.children) {
    node.children.forEach(child => {
      paths.push(...getAllPaths(child));
    });
  }
  return paths;
}