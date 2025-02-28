import { MandrakeManager, WorkspaceManager } from '@mandrake/workspace';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { NextRequest } from 'next/server';

/**
 * Creates a temporary test directory
 */
export async function createTestDirectory(prefix: string = 'api-test-'): Promise<{
  path: string;
  cleanup: () => Promise<void>;
}> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  return {
    path,
    cleanup: async () => {
      await rm(path, { recursive: true, force: true });
    }
  };
}

/**
 * Creates a test environment with MandrakeManager and a test workspace
 */
export async function createTestEnvironment(): Promise<{
  testDir: { path: string; cleanup: () => Promise<void> };
  mandrakeManager: MandrakeManager;
  workspace: WorkspaceManager;
  cleanup: () => Promise<void>;
}> {
  // Create a temporary test directory
  const testDir = await createTestDirectory();
  
  // Set the MANDRAKE_ROOT environment variable to our test directory
  const originalRoot = process.env.MANDRAKE_ROOT;
  process.env.MANDRAKE_ROOT = testDir.path;
  
  // Reset singleton instances (this is specific to our implementation)
  (global as any).mandrakeManager = undefined;
  (global as any).mcpManager = undefined;
  
  // Initialize a fresh manager
  const mandrakeManager = new MandrakeManager(testDir.path);
  await mandrakeManager.init();
  
  // Create a test workspace
  const workspace = await mandrakeManager.createWorkspace('test-workspace', 'Test workspace for API tests');
  
  // Create cleanup function
  const cleanup = async () => {
    await testDir.cleanup();
    
    // Restore environment variable
    if (originalRoot) {
      process.env.MANDRAKE_ROOT = originalRoot;
    } else {
      delete process.env.MANDRAKE_ROOT;
    }
    
    // Reset singleton instances
    (global as any).mandrakeManager = undefined;
    (global as any).mcpManager = undefined;
  };
  
  return {
    testDir,
    mandrakeManager,
    workspace,
    cleanup
  };
}

/**
 * Creates a test NextRequest with specified method, URL and optional body
 */
export function createTestRequest(method: string, url: string, body?: any): NextRequest {
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  
  const init: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };
  
  return new NextRequest(new URL(url, 'http://localhost'), init);
}

/**
 * Creates request params object for route handlers
 */
export function createParams(params: Record<string, string>): { params: Record<string, string> } {
  return { params };
}

/**
 * Creates a test file in the workspace
 */
export async function createTestFile(
  workspace: WorkspaceManager,
  fileName: string,
  content: string
): Promise<void> {
  await workspace.files.write(fileName, content);
}

/**
 * Utility to parse JSON response
 */
export async function getResponseData(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
}
