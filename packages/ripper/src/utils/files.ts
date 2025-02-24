import { readFile, writeFile, mkdir, rename, rm } from 'fs/promises';
import { dirname, basename } from 'path';
import { toRipperError, RipperError, ErrorCode } from './errors';
import { validatePath } from './paths';



/**
 * Safely read file contents
 * @throws {RipperError} if read fails or path is invalid
 */
export async function safeReadFile(
  path: string, 
  allowedDirs: string[]
): Promise<Buffer> { // <-- Change to Promise<Buffer>
  const validPath = await validatePath(path, allowedDirs);
  try {
    return await readFile(validPath); // Remove 'utf-8'
  } catch (error) {
    throw toRipperError(error);
  }
}
/**
 * Safely write content to file, creating parent directories if needed
 * @throws {RipperError} if write fails or path is invalid
 */
export async function safeWriteFile(
  path: string,
  content: string,
  allowedDirs: string[]
): Promise<void> {
  // Create parent directory first
  await mkdir(dirname(path), { recursive: true });
  const validPath = await validatePath(path, allowedDirs);
  try {
    await writeFile(validPath, content, 'utf-8');
  } catch(error) {
    throw toRipperError(error);
  }
}

/**
 * Validate all components of a path against exclude patterns
 */
async function validatePathAndParents(
  path: string,
  allowedDirs: string[],
  excludePatterns: RegExp[]
): Promise<string> {
  // First check the full path
  if (excludePatterns.some(pattern => pattern.test(path))) {
    throw new RipperError('Path matches exclude pattern', 'ACCESS_DENIED' as ErrorCode);
  }

  // Then check each parent directory
  let current = path;
  while (current !== dirname(current)) { // Stop at root
    if (excludePatterns.some(pattern => pattern.test(basename(current)))) {
      throw new RipperError('Parent directory matches exclude pattern', 'ACCESS_DENIED' as ErrorCode);
    }
    current = dirname(current);
  }

  // If we get here, no part of the path matches exclude patterns
  return await validatePath(path, allowedDirs);
}



/**
 * Safely move/rename a file or directory
 * @throws {RipperError} if move fails or paths are invalid
 */
export async function safeMove(
  source: string,
  destination: string,
  allowedDirs: string[],
  excludePatterns: RegExp[] = []
): Promise<void> {
  // Check exclude patterns BEFORE any filesystem operations
  if (excludePatterns.some(pattern => pattern.test(source) || pattern.test(destination))) {
    throw new RipperError('Path matches exclude pattern', 'ACCESS_DENIED' as ErrorCode);
  }

  // Only proceed with directory creation and validation if no paths are excluded
  await mkdir(dirname(destination), { recursive: true });
  const validSource = await validatePath(source, allowedDirs);
  const validDest = await validatePath(destination, allowedDirs);

  try {
    await rename(validSource, validDest);
  } catch (error) {
    throw toRipperError(error);
  }
}