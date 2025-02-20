import { expect, test, describe, beforeEach } from 'bun:test';
import { moveFile } from '../../src/tools';
import { join } from 'path';
import { mkdir, writeFile, readFile, stat } from 'fs/promises';
import { tmpdir } from 'os';

describe('move_file tool', () => {
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

  test('moves file successfully', async () => {
    const sourcePath = join(testDir, 'source.txt');
    const destPath = join(testDir, 'dest.txt');
    const content = 'test content';
    await writeFile(sourcePath, content);

    const result = await moveFile.execute({
      source: sourcePath,
      destination: destPath,
      allowedDirs
    });

    // Check result
    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);

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

    const result = await moveFile.execute({
      source: sourcePath,
      destination: destPath,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);

    const movedContent = await readFile(destPath, 'utf-8');
    expect(movedContent).toBe(content);
    await expect(stat(sourcePath)).rejects.toThrow();
  });

  test('handles source outside allowed directories', async () => {
    const sourcePath = join(testRoot, 'outside.txt');
    const destPath = join(testDir, 'dest.txt');
    await writeFile(sourcePath, 'test');

    const result = await moveFile.execute({
      source: sourcePath,
      destination: destPath,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
  });

  test('handles destination outside allowed directories', async () => {
    const sourcePath = join(testDir, 'source.txt');
    const destPath = join(testRoot, 'outside.txt');
    await writeFile(sourcePath, 'test');

    const result = await moveFile.execute({
      source: sourcePath,
      destination: destPath,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();

    // Verify source file wasn't moved
    const sourceContent = await readFile(sourcePath, 'utf-8');
    expect(sourceContent).toBe('test');
  });

  test('handles non-existent source', async () => {
    const sourcePath = join(testDir, 'nonexistent.txt');
    const destPath = join(testDir, 'dest.txt');

    const result = await moveFile.execute({
      source: sourcePath,
      destination: destPath,
      allowedDirs
    });

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
  });
});