import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { searchFiles, SearchFilesParams } from '../../src/tools/search_files';
import { join } from 'path';
import { mkdir, writeFile, realpath, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { createTestContext } from '../utils/test-utils';
import { parseJsonResult } from '../../src/utils/content';
import type { Tool } from '../../src/fastmcp';

interface SearchResult {
  path: string;
  pattern: string;
  matches: string[];
  error?: string;
}

describe('search_files tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let searchTool: Tool<typeof SearchFilesParams>;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    await mkdir(testDir, { recursive: true });

    // Create search tool with security context
    searchTool = searchFiles({
      allowedDirs: [testDir],
      excludePatterns: []
    });
  });

  afterEach(async () => {
    await rm(testRoot, { recursive: true, force: true });
  });

  test('finds matching file', async () => {
    const testFile = join(testDir, 'test.txt');
    await writeFile(testFile, 'line one\nline two\nline three\nline two again');

    const result = await searchTool.execute({
      path: testDir,
      pattern: 'line two',
      maxResults: 100
    }, createTestContext());

    const parsed = parseJsonResult<SearchResult>(result);
    expect(parsed?.matches).toHaveLength(1);
    const expectedPath = await realpath(testFile);
    expect(parsed?.matches[0]).toBe(expectedPath);
  });

  test('finds multiple matching files', async () => {
    const file1 = join(testDir, 'file1.txt');
    const file2 = join(testDir, 'file2.txt');
    await writeFile(file1, 'test pattern here\nno match\n');
    await writeFile(file2, 'another test pattern\n');

    const result = await searchTool.execute({
      path: testDir,
      pattern: 'test pattern',
      maxResults: 100
    }, createTestContext());

    const parsed = parseJsonResult<SearchResult>(result);
    expect(parsed?.matches).toHaveLength(2);

    const expectedPath1 = await realpath(file1);
    const expectedPath2 = await realpath(file2);
    expect(parsed?.matches).toContain(expectedPath1);
    expect(parsed?.matches).toContain(expectedPath2);
  });

  test('searches in nested directories', async () => {
    const rootFile = join(testDir, 'root.txt');
    const nestedFile = join(testDir, 'nested', 'deep.txt');
    await mkdir(join(testDir, 'nested'), { recursive: true });
    await writeFile(rootFile, 'test pattern');
    await writeFile(nestedFile, 'test pattern');

    const result = await searchTool.execute({
      path: testDir,
      pattern: 'test pattern',
      maxResults: 100
    }, createTestContext());

    const parsed = parseJsonResult<SearchResult>(result);
    expect(parsed?.matches).toHaveLength(2);

    const expectedRoot = await realpath(rootFile);
    const expectedNested = await realpath(nestedFile);
    expect(parsed?.matches).toContain(expectedRoot);
    expect(parsed?.matches).toContain(expectedNested);
  });

  test('respects exclude patterns', async () => {
    const rootFile = join(testDir, 'file.txt');
    const hiddenFile = join(testDir, '.hidden.txt');
    await writeFile(rootFile, 'test pattern');
    await writeFile(hiddenFile, 'test pattern');

    // Create a new tool with exclude patterns
    const restrictedTool = searchFiles({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const result = await restrictedTool.execute({
      path: testDir,
      pattern: 'test pattern',
      maxResults: 100
    }, createTestContext());

    const parsed = parseJsonResult<SearchResult>(result);
    expect(parsed?.matches).toHaveLength(1);
    const expectedPath = await realpath(rootFile);
    expect(parsed?.matches[0]).toBe(expectedPath);
  });

  test('respects maxResults parameter', async () => {
    // Create multiple files with matches
    for (let i = 0; i < 10; i++) {
      await writeFile(join(testDir, `file${i}.txt`), 'test pattern');
    }

    const result = await searchTool.execute({
      path: testDir,
      pattern: 'test pattern',
      maxResults: 5
    }, createTestContext());

    const parsed = parseJsonResult<SearchResult>(result);
    expect(parsed?.matches).toHaveLength(5);
  });

  test('handles directory outside allowed directories', async () => {
    const outsideDir = join(testRoot, 'outside');
    await mkdir(outsideDir);

    const result = await searchTool.execute({
      path: outsideDir,
      pattern: 'test',
      maxResults: 100
    }, createTestContext());

    const parsed = parseJsonResult<SearchResult>(result);
    expect(parsed?.error).toBeDefined();
  });

  test('handles invalid regex pattern', async () => {
    const result = await searchTool.execute({
      path: testDir,
      pattern: '[invalid regex)',
      maxResults: 100
    }, createTestContext());

    const parsed = parseJsonResult<SearchResult>(result);
    expect(parsed?.error).toBeDefined();
  });
});