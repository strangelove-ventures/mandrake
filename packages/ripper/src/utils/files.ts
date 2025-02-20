import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { dirname } from 'path';
import { RipperError, ErrorCode, toRipperError } from './errors';
import { validatePath } from './paths';

/**
 * Ensure directory exists, creating it if necessary
 * @throws {RipperError} if creation fails or path is invalid
 */
export async function ensureDir(
path: string, allowedDirs: string[], p0: boolean): Promise<void> {
  const validPath = await validatePath(path, allowedDirs);
  try {
    await mkdir(validPath, { recursive: true });
  } catch (error) {
    throw toRipperError(error);
  }
}

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
 * Safely move/rename a file or directory
 * @throws {RipperError} if move fails or paths are invalid
 */
export async function safeMove(
  source: string,
  destination: string,
  allowedDirs: string[]
): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  const validSource = await validatePath(source, allowedDirs);
  const validDest = await validatePath(destination, allowedDirs);
  try {
    await rename(validSource, validDest);
  } catch (error) {
    throw toRipperError(error); // Convert filesystem error to RipperError
  }
}
