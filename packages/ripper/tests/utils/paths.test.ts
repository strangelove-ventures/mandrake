import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import os from 'os';
import { writeFile, symlink, rm, realpath, mkdir } from 'fs/promises';
import {
  normalizePath,
  expandHomePath,
  isSubPath,
  validatePath,
  safeStats,
  ensureDir
} from '../../src/utils/paths';
import { RipperError, ErrorCode } from '../../src/utils/errors';

describe('Path Utilities', () => {
  describe('normalizePath', () => {
    test('normalizes path separators', () => {
      expect(normalizePath('foo\\bar\\baz')).toBe('foo/bar/baz');
      expect(normalizePath('foo/bar/baz')).toBe('foo/bar/baz');
    });

    test('handles relative paths', () => {
      expect(normalizePath('./foo/bar')).toBe('foo/bar');
      expect(normalizePath('../foo/bar')).toBe('../foo/bar');
    });
  });

  describe('expandHomePath', () => {
    test('expands ~ to home directory', () => {
      const homeDir = os.homedir();
      expect(expandHomePath('~/foo')).toBe(join(homeDir, 'foo'));
      expect(expandHomePath('~')).toBe(homeDir);
    });

    test('leaves other paths unchanged', () => {
      expect(expandHomePath('/absolute/path')).toBe('/absolute/path');
      expect(expandHomePath('relative/path')).toBe('relative/path');
    });
  });

  describe('isSubPath', () => {
    test('identifies valid subpaths', () => {
      expect(isSubPath('/foo', '/foo/bar')).toBe(true);
      expect(isSubPath('/foo/bar', '/foo/bar/baz')).toBe(true);
    });

    test('identifies invalid subpaths', () => {
      expect(isSubPath('/foo', '/bar')).toBe(false);
      expect(isSubPath('/foo/bar', '/foo')).toBe(false);
    });

    test('handles normalized paths', () => {
      expect(isSubPath('/foo', '/foo/../foo/bar')).toBe(true);
      expect(isSubPath('/foo\\bar', '/foo/bar/baz')).toBe(true);
    });
  });

  describe('validatePath', () => {
    const testRoot = join(os.tmpdir(), 'ripper-test');
    const testDir = join(testRoot, 'test-dir');
    const allowedDirs = [testDir];
    
    beforeEach(async () => {
      await mkdir(testDir, { recursive: true }); // Use mkdir directly
    });

    afterEach(async () => {
      try {
        await rm(testRoot, { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to clean up test directory:', error);
      }
    });

    test('validates path in allowed directory', async () => {
      const testPath = join(testDir, 'test.txt');
      await writeFile(testPath, 'test');
      const validated = await validatePath(testPath, allowedDirs);
      const resolvedTestPath = await realpath(testPath);
      expect(normalizePath(validated)).toBe(normalizePath(resolvedTestPath));
    });


    test('rejects path outside allowed directories', async () => {
      const outsidePath = join(testRoot, 'outside.txt');
      await writeFile(outsidePath, 'test');
      await expect(validatePath(outsidePath, allowedDirs))
        .rejects
        .toEqual(new RipperError(
          'Access denied - symlink target outside allowed directories',
          ErrorCode.ACCESS_DENIED
        ));
    });

    test('handles symlinks within allowed directories', async () => {
      const sourcePath = join(testDir, 'source.txt');
      const linkPath = join(testDir, 'link.txt');
      await writeFile(sourcePath, 'test');
      await symlink(sourcePath, linkPath);

      const validated = await validatePath(linkPath, allowedDirs);
      const resolvedSourcePath = await realpath(sourcePath);
      expect(normalizePath(validated)).toBe(normalizePath(resolvedSourcePath));
    });

    test('rejects symlinks pointing outside allowed directories', async () => {
      const outsidePath = join(testRoot, 'outside.txt');
      const linkPath = join(testDir, 'link.txt');
      await writeFile(outsidePath, 'test');
      await symlink(outsidePath, linkPath);

      await expect(validatePath(linkPath, allowedDirs))
        .rejects
        .toEqual(new RipperError(
          'Access denied - symlink target outside allowed directories',
          ErrorCode.ACCESS_DENIED
        ));
    });

    test('validates non-existent path in allowed directory', async () => {
      const newPath = join(testDir, 'new.txt');
      const validated = await validatePath(newPath, allowedDirs);
      expect(normalizePath(validated)).toBe(normalizePath(newPath));
    });

    test('rejects path with non-existent parent', async () => {
      const invalidPath = join(testDir, 'nonexistent', 'test.txt');
      await expect(validatePath(invalidPath, allowedDirs))
        .rejects
        .toEqual(new RipperError(
          `Parent directory does not exist: ${join(testDir, 'nonexistent')}`,
          ErrorCode.INVALID_PATH
        ));
    });
  });

  describe('safeStats', () => {
    const testRoot = join(os.tmpdir(), 'ripper-test');
    const testDir = join(testRoot, 'test-dir');
    
    beforeEach(async () => {
      await mkdir(testDir, { recursive: true }); // Use mkdir directly
    });

    afterEach(async () => {
      try {
        await rm(testRoot, { recursive: true, force: true });
      } catch (error) {
        console.error('Failed to clean up test directory:', error);
      }
    });

    test('returns stats for existing path', async () => {
      const testPath = join(testDir, 'test.txt');
      await writeFile(testPath, 'test');
      const stats = await safeStats(testPath);
      expect(stats.isFile()).toBe(true);
    });

    test('throws RipperError for non-existent path', async () => {
      const invalidPath = join(testDir, 'nonexistent.txt');
      await expect(safeStats(invalidPath))
        .rejects
        .toEqual(new RipperError(
          `Failed to get stats for ${invalidPath}: ENOENT: no such file or directory, stat '${invalidPath}'`,
          ErrorCode.IO_ERROR
        ));
    });
  });
});