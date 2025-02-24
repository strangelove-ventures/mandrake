import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { command, CommandParams } from '../../src/tools/command';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { createTestContext } from '../utils/test-utils';
import { tmpdir } from 'os';
import type { Tool } from '../../src/fastmcp';
import { parseJsonResult } from '../../src/utils/content';

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
  success: boolean;
  error?: string;
}

describe('command tool', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let cmd: Tool<typeof CommandParams>;

  beforeEach(async () => {
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    await mkdir(testDir, { recursive: true });
    cmd = command({ allowedDirs: [testDir], excludePatterns: [] });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testRoot, { recursive: true, force: true });
  });

  test('executes simple command successfully', async () => {
    const result = await cmd.execute({
      command: 'echo "hello world"'
    }, createTestContext());

    const parsed = parseJsonResult<CommandResult>(result);
    expect(parsed?.success).toBe(true);
    expect(parsed?.stdout.trim()).toBe('hello world');
    expect(parsed?.code).toBe(0);
  });

  test('executes command with working directory', async () => {
    const testFile = join(testDir, 'test.txt');
    await writeFile(testFile, 'test content');

    const result = await cmd.execute({
      command: 'ls -la',
      cwd: testDir
    }, createTestContext());

    const parsed = parseJsonResult<CommandResult>(result);
    expect(parsed?.success).toBe(true);
    expect(parsed?.stdout).toContain('test.txt');
    expect(parsed?.code).toBe(0);
  });

  test('executes command with environment variables', async () => {
    const result = await cmd.execute({
      command: 'echo $TEST_VAR',
      env: { TEST_VAR: 'test value' }
    }, createTestContext());

    const parsed = parseJsonResult<CommandResult>(result);
    expect(parsed?.success).toBe(true);
    expect(parsed?.stdout.trim()).toBe('test value');
  });

  test('handles command failure correctly', async () => {
    const result = await cmd.execute({
      command: 'cat nonexistent_file.txt'
    }, createTestContext());

    const parsed = parseJsonResult<CommandResult>(result);
    expect(parsed?.success).toBe(false);
    // Since the executeCommand call might throw an error that gets caught
    // The error message could be in either stderr or the error field
    const errorContent = parsed?.stderr || parsed?.error || '';
    expect(errorContent).toContain('No such file');
  });

  test('rejects unsafe commands', async () => {
    const result = await cmd.execute({
      command: 'rm -rf /'
    }, createTestContext());

    const parsed = parseJsonResult<CommandResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toContain('unsafe pattern');
  });

  test('respects allowed directories for cwd', async () => {
    const outsideDir = join(testRoot, 'outside');
    await mkdir(outsideDir, { recursive: true });

    const result = await cmd.execute({
      command: 'ls',
      cwd: outsideDir
    }, createTestContext());

    const parsed = parseJsonResult<CommandResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toContain('must be within allowed directories');
  });

  test('respects exclude patterns for cwd', async () => {
    const restrictedTool = command({
      allowedDirs: [testDir],
      excludePatterns: ['/\\.']
    });

    const hiddenDir = join(testDir, '.hidden');
    await mkdir(hiddenDir, { recursive: true });

    const result = await restrictedTool.execute({
      command: 'ls',
      cwd: hiddenDir
    }, createTestContext());

    const parsed = parseJsonResult<CommandResult>(result);
    expect(parsed?.success).toBe(false);
    expect(parsed?.error).toContain('matches exclude pattern');
  });
});