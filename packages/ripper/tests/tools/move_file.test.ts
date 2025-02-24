import { expect, test, describe, beforeEach } from 'bun:test';
import { moveFile, MoveFileParams } from '../../src/tools/move_file';
import { join } from 'path';
import { mkdir, rm, writeFile, readFile, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { parseJsonResult } from '../../src/utils/content';
import { createTestContext } from '../utils/test-utils';
import type { Tool } from '../../src/fastmcp';

interface MoveFileResult {
  source: string;
  destination: string;
  success: boolean;
  error?: string;
}

describe('move_file tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let moveTool: Tool<typeof MoveFileParams>;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    await mkdir(testDir, { recursive: true });

    // Create move tool with security context
    moveTool = moveFile({
      allowedDirs: [testDir],
      excludePatterns: []
    });
  });

  test('moves file successfully', async () => {
    const sourcePath = join(testDir, 'source.txt');
    const destPath = join(testDir, 'dest.txt');
    const content = 'test content';
    await writeFile(sourcePath, content);

    const result = await moveTool.execute({
      source: sourcePath,
      destination: destPath
    }, createTestContext());

    // Check result
    const parsed = parseJsonResult<MoveFileResult>(result);
    expect(parsed?.success).toBe(true);

    // Verify file was moved
    const movedContent = await readFile(destPath, 'utf-8');
    expect(movedContent).toBe(content);
    await expect(stat(sourcePath)).rejects.toThrow();
  });

  test('creates parent directories if needed', async () => {
    const sourcePath = join(testDir, 'source.txt');
    const destPath = join(testDir, 'deep', 'nested', 'dest.txt');
    const content = 'test content';
    await writeFile(sourcePath, content);

    const result = await moveTool.execute({
      source: sourcePath,
      destination: destPath
    }, createTestContext());

    const parsed = parseJsonResult<MoveFileResult>(result);
    expect(parsed?.success).toBe(true);

    const movedContent = await readFile(destPath, 'utf-8');
    expect(movedContent).toBe(content);
    await expect(stat(sourcePath)).rejects.toThrow();
  });

  test('handles source outside allowed directories', async () => {
    const sourcePath = join(testRoot, 'outside.txt');
    const destPath = join(testDir, 'dest.txt');
    await writeFile(sourcePath, 'test');

    const result = await moveTool.execute({
      source: sourcePath,
      destination: destPath
    }, createTestContext());

    const parsed = parseJsonResult<MoveFileResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBeDefined();
  });

  test('handles destination outside allowed directories', async () => {
    const sourcePath = join(testDir, 'source.txt');
    const destPath = join(testRoot, 'outside.txt');
    await writeFile(sourcePath, 'test');

    const result = await moveTool.execute({
      source: sourcePath,
      destination: destPath
    }, createTestContext());

    const parsed = parseJsonResult<MoveFileResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBeDefined();

    // Verify source file wasn't moved
    const sourceContent = await readFile(sourcePath, 'utf-8');
    expect(sourceContent).toBe('test');
  });

  test('handles non-existent source', async () => {
    const sourcePath = join(testDir, 'nonexistent.txt');
    const destPath = join(testDir, 'dest.txt');

    const result = await moveTool.execute({
      source: sourcePath,
      destination: destPath
    }, createTestContext());

    const parsed = parseJsonResult<MoveFileResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBeDefined();
  });

  test('respects exclude patterns for source', async () => {
    const sourcePath = join(testDir, '.hidden.txt');
    const destPath = join(testDir, 'visible.txt');
    await writeFile(sourcePath, 'test');

    // Create a new tool with exclude patterns
    const restrictedTool = moveFile({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const result = await restrictedTool.execute({
      source: sourcePath,
      destination: destPath
    }, createTestContext());

    const parsed = parseJsonResult<MoveFileResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBe('Path matches exclude pattern');

    // Verify files weren't touched
    await expect(readFile(sourcePath, 'utf-8')).resolves.toBe('test');
    await expect(stat(destPath)).rejects.toThrow();
  });

  test('respects exclude patterns for destination', async () => {
    const sourcePath = join(testDir, 'visible.txt');
    const destPath = join(testDir, '.hidden.txt');

    // Ensure destination file doesn't exist at the start
    try {
      await rm(destPath);
    } catch (e) {
      // Ignore errors if file doesn't exist
    }

    // Create source file
    await writeFile(sourcePath, 'test');

    // Create a new tool with exclude patterns
    const restrictedTool = moveFile({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const result = await restrictedTool.execute({
      source: sourcePath,
      destination: destPath
    }, createTestContext());

    const parsed = parseJsonResult<MoveFileResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toBe('Path matches exclude pattern');

    // Verify source file wasn't moved
    await expect(readFile(sourcePath, 'utf-8')).resolves.toBe('test');

    // Try to read destination file - should fail
    await expect(readFile(destPath, 'utf-8')).rejects.toThrow();
  });
});