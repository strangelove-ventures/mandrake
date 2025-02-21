import { expect, test, describe, beforeEach } from 'bun:test';
import { writeFile } from '../../src/tools';
import { join } from 'path';
import { mkdir, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import type { Context } from '../../src/types';

interface WriteFileResult {
  path: string;
  success: boolean;
  error?: string;
}

describe('write_file tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let allowedDirs: string[];
  let context: Context;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    allowedDirs = [testDir];
    await mkdir(testDir, { recursive: true });
    context = {};
  });

  test('writes new file successfully', async () => {
    const testFile = join(testDir, 'test.txt');
    const content = 'test content';

    const result = await writeFile.execute({
      path: testFile,
      content,
      allowedDirs
    }, context);

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
    const result = await writeFile.execute({
      path: testFile,
      content: newContent,
      allowedDirs
    }, context);

    const parsed = parseJsonResult<WriteFileResult>(result);
    expect(parsed?.success).toBe(true);

    const writtenContent = await readFile(testFile, 'utf-8');
    expect(writtenContent).toBe(newContent);
  });

  test('creates parent directories if needed', async () => {
    const deepFile = join(testDir, 'deep', 'nested', 'test.txt');
    const content = 'test content';

    const result = await writeFile.execute({
      path: deepFile,
      content,
      allowedDirs
    }, context);

    const parsed = parseJsonResult<WriteFileResult>(result);
    expect(parsed?.success).toBe(true);

    const writtenContent = await readFile(deepFile, 'utf-8');
    expect(writtenContent).toBe(content);
  });

  test('handles file outside allowed directories', async () => {
    const outsideFile = join(testRoot, 'outside.txt');
    const content = 'test content';

    const result = await writeFile.execute({
      path: outsideFile,
      content,
      allowedDirs
    }, context);

    const parsed = parseJsonResult<WriteFileResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBeDefined();
  });
});