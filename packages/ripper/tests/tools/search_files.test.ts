import { expect, test, describe, beforeEach } from 'bun:test';
import { searchFiles } from '../../src/tools';
import { join } from 'path';
import { mkdir, writeFile, realpath } from 'fs/promises';
import { tmpdir } from 'os';

describe('search_files tool', () => {
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

  test('finds matches in single file', async () => {
    await writeFile(join(testDir, 'test.txt'), 'line one\nline two\nline three\nline two again');

    const result = await searchFiles.execute({
      path: testDir,
      pattern: 'line two',
      allowedDirs,
      excludePatterns: [],
      maxResults: 100
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.matches).toHaveLength(2);
    expect(parsed.matches[0].line).toBe(2);
    expect(parsed.matches[1].line).toBe(4);
  });

  test('finds matches across multiple files', async () => {
    await writeFile(join(testDir, 'file1.txt'), 'test pattern here\nno match\n');
    await writeFile(join(testDir, 'file2.txt'), 'another test pattern\n');

    const result = await searchFiles.execute({
      path: testDir,
      pattern: 'test pattern',
      allowedDirs,
      excludePatterns: [],
      maxResults: 100
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.matches).toHaveLength(2);
    
    const files = parsed.matches.map((m: any) => m.path);
    const expectedPath1 = await realpath(join(testDir, 'file1.txt'));
    const expectedPath2 = await realpath(join(testDir, 'file2.txt'));
    expect(files).toContain(expectedPath1);
    expect(files).toContain(expectedPath2);
  });

  test('searches in nested directories', async () => {
    await mkdir(join(testDir, 'nested'), { recursive: true });
    await writeFile(join(testDir, 'root.txt'), 'test pattern');
    await writeFile(join(testDir, 'nested', 'deep.txt'), 'test pattern');

    const result = await searchFiles.execute({
      path: testDir,
      pattern: 'test pattern',
      allowedDirs,
      excludePatterns: [],
      maxResults: 100
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.matches).toHaveLength(2);
  });

  test('respects exclude patterns', async () => {
    await mkdir(join(testDir, 'node_modules'), { recursive: true });
    await writeFile(join(testDir, 'file.txt'), 'test pattern');
    await writeFile(join(testDir, 'node_modules', 'module.txt'), 'test pattern');

    const result = await searchFiles.execute({
      path: testDir,
      pattern: 'test pattern',
      excludePatterns: ['node_modules'],
      allowedDirs,
      maxResults: 100
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.matches).toHaveLength(1);
    const expectedPath = await realpath(join(testDir, 'file.txt'));
    expect(parsed.matches[0].path).toBe(expectedPath);
  });

  test('respects maxResults parameter', async () => {
    // Create file with multiple matches
    const content = Array(10).fill('test pattern').join('\n');
    await writeFile(join(testDir, 'test.txt'), content);

    const result = await searchFiles.execute({
      path: testDir,
      pattern: 'test pattern',
      allowedDirs,
      maxResults: 5,
      excludePatterns: []
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.matches).toHaveLength(5);
  });

  test('handles directory outside allowed directories', async () => {
    const outsideDir = join(testRoot, 'outside');
    await mkdir(outsideDir);

    const result = await searchFiles.execute({
      path: outsideDir,
      pattern: 'test',
      allowedDirs,
      excludePatterns: [],
      maxResults: 100
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });

  test('handles invalid regex pattern', async () => {
    const result = await searchFiles.execute({
      path: testDir,
      pattern: '[invalid regex)',
      allowedDirs,
      excludePatterns: [],
      maxResults: 100
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });
});