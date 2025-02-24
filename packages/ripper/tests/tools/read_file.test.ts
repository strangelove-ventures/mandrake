import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { readFiles, ReadFilesParams } from '../../src/tools/read_file';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import { createTestContext } from '../utils/test-utils';
import type { Tool } from '../../src/fastmcp';

interface ReadFileResult {
  path: string;
  content: string;
  error?: string;
}

describe('read_files tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let readTool: Tool<typeof ReadFilesParams>;

  beforeEach(async () => {
    // Create unique test directory
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');

    // Create test directory
    await mkdir(testDir, { recursive: true });

    // Create tool with security context
    readTool = readFiles({
      allowedDirs: [testDir],
      excludePatterns: []
    });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testRoot, { recursive: true, force: true });
  });

  test('reads single file successfully', async () => {
    const testFile = join(testDir, 'test.txt');
    const content = 'test content';
    await writeFile(testFile, content);

    const result = await readTool.execute({
      paths: [testFile]
    }, createTestContext());

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

    const result = await readTool.execute({
      paths: files.map(f => join(testDir, f.name))
    }, createTestContext());

    const parsed = parseJsonResult<ReadFileResult[]>(result);
    expect(parsed).toHaveLength(2);

    for (let i = 0; i < files.length; i++) {
      expect(parsed?.[i].content).toBe(files[i].content);
      expect(parsed?.[i].error).toBeUndefined();
    }
  });

  test('handles non-existent file', async () => {
    const nonexistentFile = join(testDir, 'nonexistent.txt');

    const result = await readTool.execute({
      paths: [nonexistentFile]
    }, createTestContext());

    const parsed = parseJsonResult<ReadFileResult[]>(result);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].error).toBeDefined();
  });

  test('handles file outside allowed directories', async () => {
    const outsideFile = join(testRoot, 'outside.txt');
    await writeFile(outsideFile, 'test');

    const result = await readTool.execute({
      paths: [outsideFile]
    }, createTestContext());

    const parsed = parseJsonResult<ReadFileResult[]>(result);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].error).toBeDefined();
  });

  test('respects exclude patterns', async () => {
    const files = [
      { name: 'test.txt', content: 'visible' },
      { name: '.hidden/file.txt', content: 'hidden' }
    ];

    // Create .hidden directory and files
    await mkdir(join(testDir, '.hidden'), { recursive: true });
    for (const file of files) {
      await writeFile(join(testDir, file.name), file.content);
    }

    // Create a new tool with exclude patterns
    const restrictedTool = readFiles({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const result = await restrictedTool.execute({
      paths: files.map(f => join(testDir, f.name))
    }, createTestContext());

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