import { expect, test, describe, beforeEach } from 'bun:test';
import { writeFile, WriteFileParams } from '../../src/tools/write_file';
import { join } from 'path';
import { mkdir, readFile, stat } from 'fs/promises';
import { createTestContext } from '../utils/test-utils';
import { tmpdir } from 'os';
import type { Tool } from '../../src/fastmcp';
import { parseJsonResult } from '../../src/utils/content';

interface WriteFileResult {
  path: string;
  success: boolean;
  error?: string;
}

describe('write_file tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let wf: Tool<typeof WriteFileParams>;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    await mkdir(testDir, { recursive: true });
    wf = writeFile({ allowedDirs: [testDir], excludePatterns: [] });
  });

  test('writes new file successfully', async () => {
    const testFile = join(testDir, 'test.txt');
    const content = 'test content';

    const result = await wf.execute({
      path: testFile,
      content
    }, createTestContext());

    // Check result
    const parsed = parseJsonResult<WriteFileResult>(result);
    expect(parsed?.success).toBe(true);

    // Verify file content
    const writtenContent = await readFile(testFile, 'utf-8');
    expect(writtenContent).toBe(content);
  });

  test('overwrites existing file', async () => {
    const testFile = join(testDir, 'test.txt');
    await Bun.write(testFile, 'original content');

    const newContent = 'new content';
    const result = await wf.execute({
      path: testFile,
      content: newContent
    }, createTestContext());

    const parsed = parseJsonResult<WriteFileResult>(result);
    expect(parsed?.success).toBe(true);

    const writtenContent = await readFile(testFile, 'utf-8');
    expect(writtenContent).toBe(newContent);
  });

  test('creates parent directories if needed', async () => {
    const deepFile = join(testDir, 'deep', 'nested', 'test.txt');
    const content = 'test content';

    const result = await wf.execute({
      path: deepFile,
      content
    }, createTestContext());

    const parsed = parseJsonResult<WriteFileResult>(result);
    expect(parsed?.success).toBe(true);

    const writtenContent = await readFile(deepFile, 'utf-8');
    expect(writtenContent).toBe(content);
  });

  test('handles file outside allowed directories', async () => {
    const outsideFile = join(testRoot, 'outside.txt');
    const content = 'test content';

    const result = await wf.execute({
      path: outsideFile,
      content
    }, createTestContext());

    const parsed = parseJsonResult<WriteFileResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBeDefined();
  });

  test('respects exclude patterns', async () => {
    const hiddenFile = join(testDir, '.hidden.txt');
    const content = 'test content';

    // Create a new tool with exclude patterns
    const restrictedTool = writeFile({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const result = await restrictedTool.execute({
      path: hiddenFile,
      content
    }, createTestContext());

    const parsed = parseJsonResult<WriteFileResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBe('Path matches exclude pattern');

    // Make sure the file wasn't created
    await expect(stat(hiddenFile)).rejects.toThrow();
  });

  test('respects exclude patterns in deep paths', async () => {
    const deepHiddenFile = join(testDir, 'visible', '.hidden', 'file.txt');
    const content = 'test content';

    // Create a new tool with exclude patterns
    const restrictedTool = writeFile({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const result = await restrictedTool.execute({
      path: deepHiddenFile,
      content
    }, createTestContext());

    const parsed = parseJsonResult<WriteFileResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBe('Path matches exclude pattern');

    // Make sure the directory structure wasn't created
    await expect(stat(join(testDir, 'visible', '.hidden'))).rejects.toThrow();
  });
});