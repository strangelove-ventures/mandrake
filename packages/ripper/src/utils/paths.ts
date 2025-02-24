import { homedir } from 'os';
import { normalize, resolve, join, isAbsolute, basename, dirname } from 'path';
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
  allowedDirs: string[],
  excludePatterns: RegExp[] = [],
  requireParentExists = true
): Promise<string> {
  // Check exclude patterns first
  if (excludePatterns.some(pattern => pattern.test(requestedPath))) {
    throw new RipperError(
      'Path matches exclude pattern',
      ErrorCode.ACCESS_DENIED
    );
  }

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
          if (requireParentExists) {
            throw new RipperError(
              `Parent directory does not exist: ${parentDir}`,
              ErrorCode.INVALID_PATH
            );
          }
          // If we don't require parent to exist, just check if it would be allowed
          const normalizedParent = normalizePath(parentDir);
          if (!isAllowedPath(normalizedParent)) {
            throw new RipperError(
              'Access denied - parent directory outside allowed directories',
              ErrorCode.ACCESS_DENIED
            );
          }
          return absolute;
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
export async function ensureDir(
  path: string,
  allowedDirs: string[]
): Promise<void> {
  const validPath = await validatePathForCreation(path, allowedDirs);

  try {
    await mkdir(validPath, { recursive: true });
    const testStat = await stat(validPath);
  } catch (error) {
    throw new RipperError(
      `Failed to create directory ${path}: ${(error as Error).message}`,
      ErrorCode.IO_ERROR
    );
  }
}

export async function validatePathForCreation(
  requestedPath: string,
  allowedDirs: string[]
): Promise<string> {
  const resolvedAllowedDirs = await Promise.all(
    allowedDirs.map(async dir => {
      const resolved = await realpath(resolve(dir));
      return normalizePath(resolved);
    })
  );

  const expandedPath = expandHomePath(requestedPath);
  const absolute = isAbsolute(expandedPath)
    ? resolve(expandedPath)
    : resolve(process.cwd(), expandedPath);

  // Walk up the path until we find an existing directory we can resolve
  let current = absolute;
  let components = [];

  while (current !== dirname(current)) { // Stop at root
    try {
      const resolved = await realpath(current);
      // Add back the components in reverse order
      const fullPath = components.reduce((path, comp) =>
        join(path, comp), resolved);
      const normalizedPath = normalizePath(fullPath);

      const isAllowed = resolvedAllowedDirs.some(dir =>
        normalizedPath === dir || isSubPath(dir, normalizedPath)
      );

      if (!isAllowed) {
        throw new RipperError(
          'Access denied - path outside allowed directories',
          ErrorCode.ACCESS_DENIED
        );
      }

      return fullPath;
    } catch (error) {
      if ((error as any)?.code !== 'ENOENT') {
        throw error;
      }
      // Path doesn't exist, save the component and move up
      components.unshift(basename(current));
      current = dirname(current);
    }
  }

  // If we got here, we couldn't find any existing parent
  throw new RipperError(
    'Could not find existing parent directory',
    ErrorCode.INVALID_PATH
  );
}