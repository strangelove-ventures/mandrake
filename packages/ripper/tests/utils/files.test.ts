import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import { mkdir, writeFile, readFile, stat } from 'fs/promises';
import { tmpdir } from 'os';
import {
  ensureDir
} from '../../src/utils/paths';
import {
  safeReadFile,
  safeWriteFile,
  safeMove,
} from '../../src/utils/files';
import { RipperError } from '../../src/utils/errors';

describe('File Utilities', () => {
  const tmpDir = tmpdir();
  let testRoot: string;
  let testDir: string;
  let allowedDirs: string[];

  beforeEach(async () => {
    // Create unique test root directory
    testRoot = join(tmpDir, `ripper-test-${Date.now()}`);
    testDir = join(testRoot, 'test-dir');
    allowedDirs = [testDir];

    // Create test directory structure
    await mkdir(testRoot, { recursive: true });
    await mkdir(testDir, { recursive: true });
  });

  describe('ensureDir', () => {
    test('creates directory in allowed path', async () => {
      const newDir = join(testDir, 'new-dir');
      await ensureDir(newDir, allowedDirs);
      const stats = await stat(newDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('succeeds if directory already exists', async () => {
      await ensureDir(testDir, allowedDirs);
      const stats = await stat(testDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('rejects path outside allowed directories', async () => {
      const outsideDir = join(testRoot, 'outside');
      await expect(ensureDir(outsideDir, allowedDirs))
        .rejects
        .toThrow(RipperError);
    });
  });

  describe('safeReadFile', () => {
    test('reads file in allowed path', async () => {
      const testPath = join(testDir, 'test.txt');
      const content = 'test content';
      await writeFile(testPath, content);

      const read = await safeReadFile(testPath, allowedDirs);
      expect(read.toString()).toBe(content);
    });

    test('rejects path outside allowed directories', async () => {
      const outsidePath = join(testRoot, 'outside.txt');
      await writeFile(outsidePath, 'test');

      await expect(safeReadFile(outsidePath, allowedDirs))
        .rejects
        .toThrow(RipperError);
    });

    test('handles non-existent file', async () => {
      const nonexistentPath = join(testDir, 'nonexistent.txt');
      await expect(safeReadFile(nonexistentPath, allowedDirs))
        .rejects
        .toThrow(RipperError);
    });
  });

  describe('safeWriteFile', () => {
    test('writes file in allowed path', async () => {
      const testPath = join(testDir, 'test.txt');
      const content = 'test content';

      await safeWriteFile(testPath, content, allowedDirs);

      const written = await readFile(testPath, 'utf-8');
      expect(written).toBe(content);
    });

    test('creates parent directories if needed', async () => {
      const deepPath = join(testDir, 'deep', 'nested', 'test.txt');
      const content = 'test content';

      await safeWriteFile(deepPath, content, allowedDirs);

      const written = await readFile(deepPath, 'utf-8');
      expect(written).toBe(content);
    });

    test('rejects path outside allowed directories', async () => {
      const outsidePath = join(testRoot, 'outside.txt');
      await expect(safeWriteFile(outsidePath, 'test', allowedDirs))
        .rejects
        .toThrow(RipperError);
    });
  });

  describe('safeMove', () => {
    test('moves file within allowed path', async () => {
      const sourcePath = join(testDir, 'source.txt');
      const destPath = join(testDir, 'dest.txt');
      const content = 'test content';

      await writeFile(sourcePath, content);
      await safeMove(sourcePath, destPath, allowedDirs);

      const moved = await readFile(destPath, 'utf-8');
      expect(moved).toBe(content);

      await expect(stat(sourcePath)).rejects.toThrow();
    });

    test('creates parent directories if needed', async () => {
      const sourcePath = join(testDir, 'source.txt');
      const destPath = join(testDir, 'deep', 'nested', 'dest.txt');
      const content = 'test content';

      await writeFile(sourcePath, content);
      await safeMove(sourcePath, destPath, allowedDirs);

      const moved = await readFile(destPath, 'utf-8');
      expect(moved).toBe(content);
    });

    test('rejects source outside allowed directories', async () => {
      const sourcePath = join(testRoot, 'source.txt');
      const destPath = join(testDir, 'dest.txt');
      await writeFile(sourcePath, 'test');

      await expect(safeMove(sourcePath, destPath, allowedDirs))
        .rejects
        .toThrow(RipperError);
    });

    test('rejects destination outside allowed directories', async () => {
      const sourcePath = join(testDir, 'source.txt');
      const destPath = join(testRoot, 'dest.txt');
      await writeFile(sourcePath, 'test');

      await expect(safeMove(sourcePath, destPath, allowedDirs))
        .rejects
        .toThrow(RipperError);
    });

    test('handles non-existent source', async () => {
      const sourcePath = join(testDir, 'nonexistent.txt');
      const destPath = join(testDir, 'dest.txt');

      await expect(safeMove(sourcePath, destPath, allowedDirs))
        .rejects
        .toThrow(RipperError);
    });
  });
});