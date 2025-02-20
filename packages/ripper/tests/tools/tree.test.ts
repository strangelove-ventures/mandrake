import { expect, test, describe, beforeEach } from 'bun:test';
import { tree } from '../../src/tools';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';

describe('tree tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let allowedDirs: string[];

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    allowedDirs = [testDir];
    await mkdir(testDir, { recursive: true });
  });

  test('shows empty directory structure', async () => {
    const result = await tree.execute({
      path: testDir,
      allowedDirs,
      depth: 3
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.tree.type).toBe('directory');
    expect(parsed.tree.children).toHaveLength(0);
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
      depth: 3
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    
    // Check root structure
    expect(parsed.tree.type).toBe('directory');
    expect(parsed.tree.children).toHaveLength(3); // dir1, dir2, file1.txt

    // Find dir1 and check its structure
    const dir1 = parsed.tree.children.find((c: any) => c.name === 'dir1');
    expect(dir1).toBeDefined();
    expect(dir1.type).toBe('directory');
    expect(dir1.children).toHaveLength(2); // nested, file2.txt

    // Check nested directory
    const nested = dir1.children.find((c: any) => c.name === 'nested');
    expect(nested).toBeDefined();
    expect(nested.type).toBe('directory');
    expect(nested.children).toHaveLength(1); // file3.txt
  });

  test('respects depth parameter', async () => {
    // Create deep structure
    await mkdir(join(testDir, 'dir1', 'nested1', 'nested2'), { recursive: true });
    await writeFile(join(testDir, 'dir1', 'nested1', 'nested2', 'deep.txt'), 'content');

    const result = await tree.execute({
      path: testDir,
      allowedDirs,
      depth: 2
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);

    // Navigate to nested1 and ensure it doesn't show deeper content
    const dir1 = parsed.tree.children.find((c: any) => c.name === 'dir1');
    const nested1 = dir1.children.find((c: any) => c.name === 'nested1');
    expect(nested1.children).toBeUndefined();
  });

  test('handles directory outside allowed directories', async () => {
    const outsideDir = join(testRoot, 'outside');
    await mkdir(outsideDir);

    const result = await tree.execute({
      path: outsideDir,
      allowedDirs,
      depth: 3
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });

  test('handles non-existent directory', async () => {
    const nonexistentDir = join(testDir, 'nonexistent');

    const result = await tree.execute({
      path: nonexistentDir,
      allowedDirs,
      depth: 3
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });
});