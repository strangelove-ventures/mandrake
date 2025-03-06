import tmp from 'tmp';
import { rm } from 'fs/promises';
import { Hono } from 'hono';
import { createApp } from '../src/index';

/**
 * Create a temporary directory and run the provided function with it
 * Clean up after the function completes or throws
 */
export async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = tmp.dirSync({ unsafeCleanup: true });
  try {
    await fn(dir.name);
  } finally {
    await rm(dir.name, { recursive: true, force: true });
  }
}

/**
 * Create a test app using a temporary directory
 */
export async function createTestApp(): Promise<{ app: Hono, tempDir: string }> {
  const tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
  const app = await createApp({ mandrakeHome: tempDir });
  
  return { app, tempDir };
}

/**
 * Clean up the test app's temporary directory
 */
export async function cleanupTestApp(tempDir: string): Promise<void> {
  await rm(tempDir, { recursive: true, force: true });
}