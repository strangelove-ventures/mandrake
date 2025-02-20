import { expect, test, describe, beforeEach } from 'bun:test';
import { listDirectory } from '../../src/tools';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';

describe('list_directory tool', () => {
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

  test('lists empty directory', async () => {
    const result = await listDirectory.execute({
      path: testDir,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toHaveLength(0);
  });

  test('lists files and directories', async () => {
    // Create test structure
    await writeFile(join(testDir, 'file1.txt'), 'content');
    await writeFile(join(testDir, 'file2.txt'), 'content');
    await mkdir(join(testDir, 'dir1'));
    await mkdir(join(testDir, 'dir2'));

    const result = await listDirectory.execute({
      path: testDir,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.items).toHaveLength(4);

    // Verify directories are listed first
    expect(parsed.items[0].type).toBe('DIR');
    expect(parsed.items[1].type).toBe('DIR');
    expect(parsed.items[2].type).toBe('FILE');
    expect(parsed.items[3].type).toBe('FILE');

    // Verify alphabetical ordering within types
    expect(parsed.items[0].name).toBe('dir1');
    expect(parsed.items[1].name).toBe('dir2');
    expect(parsed.items[2].name).toBe('file1.txt');
    expect(parsed.items[3].name).toBe('file2.txt');
  });

  test('handles directory outside allowed directories', async () => {
    const outsideDir = join(testRoot, 'outside');
    await mkdir(outsideDir);

    const result = await listDirectory.execute({
      path: outsideDir,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });

  test('handles non-existent directory', async () => {
    const nonexistentDir = join(testDir, 'nonexistent');

    const result = await listDirectory.execute({
      path: nonexistentDir,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });
});