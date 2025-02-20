import { homedir } from 'os';
import { normalize, resolve, join, isAbsolute } from 'path';
import { stat, realpath, mkdir } from 'fs/promises';
import { RipperError, ErrorCode } from './errors';

/**
 * Normalize a path to a consistent format
 */
export function normalizePath(p: string): string {
  return normalize(p).replace(/\\/g, '/');
}

/**
 * Expand ~ to home directory
 */
export function expandHomePath(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return join(homedir(), p.slice(1));
  }
  return p;
}

/**
 * Check if child path is a subpath of parent
 */
export function isSubPath(parent: string, child: string): boolean {
  const normalizedParent = normalizePath(parent + '/');
  const normalizedChild = normalizePath(child + '/');
  return normalizedChild.startsWith(normalizedParent);
}

/**
 * Convert a path to an absolute path and validate it
 * @throws {RipperError} if path is invalid or inaccessible
 */
export async function validatePath(
  requestedPath: string,
  allowedDirs: string[]
): Promise<string> {
  // First resolve all allowed dirs
  const resolvedAllowedDirs = await Promise.all(
    allowedDirs.map(async dir => {
      const resolved = await realpath(resolve(dir));
      return normalizePath(resolved);
    })
  );

  // Expand and resolve the requested path
  const expandedPath = expandHomePath(requestedPath);
  const absolute = isAbsolute(expandedPath)
    ? resolve(expandedPath)
    : resolve(process.cwd(), expandedPath);

  const isAllowedPath = (path: string) =>
    resolvedAllowedDirs.some(dir => path === dir || isSubPath(dir, path));

  try {
    // For existing paths, validate real path
    const resolvedPath = await realpath(absolute);
    const normalizedResolved = normalizePath(resolvedPath);

    if (!isAllowedPath(normalizedResolved)) {
      throw new RipperError(
        'Access denied - symlink target outside allowed directories',
        ErrorCode.ACCESS_DENIED
      );
    }

    return resolvedPath;
  } catch (error) {
    if (error instanceof RipperError) {
      throw error;
    }

    // Only handle ENOENT for new files
    if ((error as any)?.code === 'ENOENT') {
      // For new files, verify parent exists and is allowed
      const parentDir = join(absolute, '..');
      try {
        const resolvedParent = await realpath(parentDir);
        const normalizedParent = normalizePath(resolvedParent);

        if (!isAllowedPath(normalizedParent)) {
          throw new RipperError(
            'Access denied - parent directory outside allowed directories',
            ErrorCode.ACCESS_DENIED
          );
        }

        return absolute;
      } catch (parentError) {
        if ((parentError as any)?.code === 'ENOENT') {
          throw new RipperError(
            `Parent directory does not exist: ${parentDir}`,
            ErrorCode.INVALID_PATH
          );
        }
        throw parentError;
      }
    }

    throw error;
  }
}

/**
 * Get file/directory stats with proper error handling
 */
export async function safeStats(path: string) {
  try {
    return await stat(path);
  } catch (error) {
    throw new RipperError(
      `Failed to get stats for ${path}: ${(error as Error).message}`,
      ErrorCode.IO_ERROR
    );
  }
}

/**
 * Ensure directory exists, creating it if necessary
 */
export async function ensureDir(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    throw new RipperError(
      `Failed to create directory ${path}: ${(error as Error).message}`,
      ErrorCode.IO_ERROR
    );
  }
}