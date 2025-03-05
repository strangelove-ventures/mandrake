/**
 * Utility functions for API route testing
 */
import { NextRequest } from 'next/server';
import { createTestDirectory, TestDirectory } from '../../utils/test-dir';
import { resetServiceRegistryForTesting } from '@/server/services/registry';
import { getMandrakeManagerForRequest, getWorkspaceManagerForRequest } from '@/server/services/helpers';
import { WorkspaceManager } from '@mandrake/workspace';
import { randomUUID } from 'crypto';

/**
 * Set up a test environment with temporary directories
 */
export async function setupApiTest(): Promise<{
  testDir: TestDirectory;
  originalMandrakeRoot: string | undefined;
}> {
  const originalMandrakeRoot = process.env.MANDRAKE_ROOT;
  const testDir = await createTestDirectory();
  
  // Set MANDRAKE_ROOT environment variable
  process.env.MANDRAKE_ROOT = testDir.path;
  
  // Reset registry for testing
  resetServiceRegistryForTesting();
  
  return { testDir, originalMandrakeRoot };
}

/**
 * Clean up test environment
 */
export async function cleanupApiTest(testDir: TestDirectory, originalMandrakeRoot?: string): Promise<void> {
  // Restore original environment
  process.env.MANDRAKE_ROOT = originalMandrakeRoot;
  
  // Clean up test directory
  await testDir.cleanup();
}

/**
 * Create a test workspace for API tests
 */
export async function createTestWorkspace(name?: string): Promise<WorkspaceManager> {
  const mandrake = await getMandrakeManagerForRequest();
  const workspaceName = name || `test-ws-${randomUUID().slice(0, 8)}`;
  return await mandrake.createWorkspace(workspaceName);
}

/**
 * Create a NextRequest for testing
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, any>;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {} } = options;
  
  // Set default headers
  const requestHeaders = new Headers();
  requestHeaders.set('Content-Type', 'application/json');
  
  // Add custom headers
  Object.entries(headers).forEach(([key, value]) => {
    requestHeaders.set(key, value);
  });
  
  // Create request
  return new NextRequest(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined
  });
}

/**
 * Parse API response
 */
export async function parseApiResponse<T = any>(response: Response): Promise<{
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  status: number;
}> {
  const status = response.status;
  
  if (status === 204) {
    // No content response
    return { success: true, status };
  }
  
  const responseData = await response.json();
  return { ...responseData, status };
}
