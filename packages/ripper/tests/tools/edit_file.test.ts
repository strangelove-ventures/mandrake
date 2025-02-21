import { expect, test, describe, beforeEach } from 'bun:test';
import { editFile } from '../../src/tools';
import { join } from 'path';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import type { Context } from '../../src/types';

interface EditResult {
  path: string;
  success: boolean;
  diff?: string;
  error?: string;
}

describe('edit_file tool', () => {
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

  test('performs single edit successfully', async () => {
    const testFile = join(testDir, 'test.txt');
    const originalContent = 'hello world';
    await writeFile(testFile, originalContent);

    const result = await editFile.execute({
      path: testFile,
      edits: [{ oldText: 'world', newText: 'there' }],
      allowedDirs,
      dryRun: false
    }, context);

    // Check result format
    const parsed = parseJsonResult<EditResult>(result);
    expect(parsed?.success).toBe(true);
    expect(parsed?.diff).toBeDefined();

    // Verify file content
    const finalContent = await readFile(testFile, 'utf-8');
    expect(finalContent).toBe('hello there');
  });

  test('performs multiple edits successfully', async () => {
    const testFile = join(testDir, 'test.txt');
    const originalContent = 'hello world hello earth';
    await writeFile(testFile, originalContent);

    const result = await editFile.execute({
      path: testFile,
      edits: [
        { oldText: 'world', newText: 'there' },
        { oldText: 'earth', newText: 'mars' }
      ],
      allowedDirs,
      dryRun: false
    }, context);

    const parsed = parseJsonResult<EditResult>(result);
    expect(parsed?.success).toBe(true);

    const finalContent = await readFile(testFile, 'utf-8');
    expect(finalContent).toBe('hello there hello mars');
  });

  test('handles non-existent text to replace', async () => {
    const testFile = join(testDir, 'test.txt');
    const originalContent = 'hello world';
    await writeFile(testFile, originalContent);

    const result = await editFile.execute({
      path: testFile,
      edits: [{ oldText: 'nonexistent', newText: 'test' }],
      allowedDirs,
      dryRun: false
    }, context);

    const parsed = parseJsonResult<EditResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toContain('Could not find text to replace');

    // Verify file wasn't changed
    const finalContent = await readFile(testFile, 'utf-8');
    expect(finalContent).toBe(originalContent);
  });

  test('performs dry run without modifying file', async () => {
    const testFile = join(testDir, 'test.txt');
    const originalContent = 'hello world';
    await writeFile(testFile, originalContent);

    const result = await editFile.execute({
      path: testFile,
      edits: [{ oldText: 'world', newText: 'there' }],
      allowedDirs,
      dryRun: true
    }, context);

    const parsed = parseJsonResult<EditResult>(result);
    expect(parsed?.success).toBe(true);
    expect(parsed?.diff).toBeDefined();

    // Verify file wasn't changed
    const finalContent = await readFile(testFile, 'utf-8');
    expect(finalContent).toBe(originalContent);
  });

  test('handles file outside allowed directories', async () => {
    const outsideFile = join(testRoot, 'outside.txt');
    await writeFile(outsideFile, 'test content');

    const result = await editFile.execute({
      path: outsideFile,
      edits: [{ oldText: 'test', newText: 'new' }],
      allowedDirs,
      dryRun: false
    }, context);

    const parsed = parseJsonResult<EditResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBeDefined();
  });
});