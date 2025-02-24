// edit_file.test.ts
import { expect, test, describe, beforeEach } from 'bun:test';
import { editFile, EditParams } from '../../src/tools/edit_file';
import { join } from 'path';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import { createTestContext } from '../utils/test-utils';
import type { Tool } from '../../src/fastmcp';

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
  let editTool: Tool<typeof EditParams>;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    await mkdir(testDir, { recursive: true });

    // Create edit tool with security context
    editTool = editFile({
      allowedDirs: [testDir],
      excludePatterns: []
    });
  });

  test('performs single edit successfully', async () => {
    const testFile = join(testDir, 'test.txt');
    const originalContent = 'hello world';
    await writeFile(testFile, originalContent);

    const result = await editTool.execute({
      path: testFile,
      edits: [{ oldText: 'world', newText: 'there' }],
      dryRun: false
    }, createTestContext());

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

    const result = await editTool.execute({
      path: testFile,
      edits: [
        { oldText: 'world', newText: 'there' },
        { oldText: 'earth', newText: 'mars' }
      ],
      dryRun: false
    }, createTestContext());

    const parsed = parseJsonResult<EditResult>(result);
    expect(parsed?.success).toBe(true);

    const finalContent = await readFile(testFile, 'utf-8');
    expect(finalContent).toBe('hello there hello mars');
  });

  test('handles non-existent text to replace', async () => {
    const testFile = join(testDir, 'test.txt');
    const originalContent = 'hello world';
    await writeFile(testFile, originalContent);

    const result = await editTool.execute({
      path: testFile,
      edits: [{ oldText: 'nonexistent', newText: 'test' }],
      dryRun: false
    }, createTestContext());

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

    const result = await editTool.execute({
      path: testFile,
      edits: [{ oldText: 'world', newText: 'there' }],
      dryRun: true
    }, createTestContext());

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

    const result = await editTool.execute({
      path: outsideFile,
      edits: [{ oldText: 'test', newText: 'new' }],
      dryRun: false
    }, createTestContext());

    const parsed = parseJsonResult<EditResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBeDefined();
  });

  test('respects exclude patterns', async () => {
    const hiddenFile = join(testDir, '.hidden.txt');
    const content = 'test content';
    await writeFile(hiddenFile, content);

    // Create a new tool with exclude patterns
    const restrictedTool = editFile({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const result = await restrictedTool.execute({
      path: hiddenFile,
      edits: [{ oldText: 'test', newText: 'new' }],
      dryRun: false
    }, createTestContext());

    const parsed = parseJsonResult<EditResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBe('Path matches exclude pattern');

    // Verify file wasn't changed
    const finalContent = await readFile(hiddenFile, 'utf-8');
    expect(finalContent).toBe(content);
  });
});