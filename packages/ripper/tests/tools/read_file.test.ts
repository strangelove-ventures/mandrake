import { expect, test, describe, beforeEach, afterAll, afterEach } from 'bun:test';
import { readFiles } from '../../src/tools';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import type { Context } from '../../src/types';

interface ReadFileResult {
  path: string;
  content: string;
  error?: string;
}

describe('read_files tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let allowedDirs: string[];
  let context: Context;
  let excludePatterns: string[];

  beforeEach(async () => {
    // Create unique test directory
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    allowedDirs = [testDir];
    excludePatterns = [];

    // Create test directory
    await mkdir(testDir, { recursive: true });
    context = {};
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testRoot, { recursive: true, force: true });
  });

  test('reads single file successfully', async () => {
    const testFile = join(testDir, 'test.txt');
    const content = 'test content';
    await writeFile(testFile, content);

    const result = await readFiles.execute({
      paths: [testFile],
      allowedDirs,
      excludePatterns
    }, context);

    const parsed = parseJsonResult<ReadFileResult[]>(result);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].content).toBe(content);
    expect(parsed?.[0].error).toBeUndefined();
  });

  test('reads multiple files successfully', async () => {
    const files = [
      { name: 'test1.txt', content: 'content 1' },
      { name: 'test2.txt', content: 'content 2' }
    ];

    for (const file of files) {
      await writeFile(join(testDir, file.name), file.content);
    }

    const result = await readFiles.execute({
      paths: files.map(f => join(testDir, f.name)),
      allowedDirs,
      excludePatterns
    }, context);

    const parsed = parseJsonResult<ReadFileResult[]>(result);
    expect(parsed).toHaveLength(2);

    for (let i = 0; i < files.length; i++) {
      expect(parsed?.[i].content).toBe(files[i].content);
      expect(parsed?.[i].error).toBeUndefined();
    }
  });

  test('handles non-existent file', async () => {
    const nonexistentFile = join(testDir, 'nonexistent.txt');

    const result = await readFiles.execute({
      paths: [nonexistentFile],
      allowedDirs,
      excludePatterns
    }, context);

    const parsed = parseJsonResult<ReadFileResult[]>(result);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].error).toBeDefined();
  });

  test('handles file outside allowed directories', async () => {
    const outsideFile = join(testRoot, 'outside.txt');
    await writeFile(outsideFile, 'test');

    const result = await readFiles.execute({
      paths: [outsideFile],
      allowedDirs,
      excludePatterns
    }, context);

    const parsed = parseJsonResult<ReadFileResult[]>(result);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].error).toBeDefined();
  });

  test('respects exclude patterns', async () => {
    const files = [
      { name: 'test.txt', content: 'visible' },
      { name: '.ws/hidden.txt', content: 'hidden' }
    ];

    // Create .ws directory and files
    await mkdir(join(testDir, '.ws'), { recursive: true });
    for (const file of files) {
      await writeFile(join(testDir, file.name), file.content);
    }

    const result = await readFiles.execute({
      paths: files.map(f => join(testDir, f.name)),
      allowedDirs,
      excludePatterns: ['^.*\.ws.*$']
    }, context);

    const parsed = parseJsonResult<ReadFileResult[]>(result);
    expect(parsed).toHaveLength(2);

    // First file should be read successfully
    expect(parsed?.[0].content).toBe('visible');
    expect(parsed?.[0].error).toBeUndefined();

    // Second file should be excluded
    expect(parsed?.[1].content).toBe('');
    expect(parsed?.[1].error).toBe('Path matches exclude pattern');
  });

});