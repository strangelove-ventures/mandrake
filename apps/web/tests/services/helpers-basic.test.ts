/**
 * Basic test for service helpers
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { getWorkspaceManagerForRequest } from '../../src/lib/services/helpers';
import { createTempDir, cleanupTempDir } from '../utils/test-dir';

describe('Service Helpers', () => {
  let tempDirPath: string;
  
  beforeEach(async () => {
    // Create a fresh temporary directory
    tempDirPath = await createTempDir();
    
    // Clear the registry singleton
    try {
      delete require.cache[require.resolve('../../src/lib/services/registry')];
      delete require.cache[require.resolve('../../src/lib/services/helpers')];
    } catch (error) {
      console.warn('Could not reset modules', error);
    }
  });
  
  afterEach(async () => {
    // Clean up the temporary directory
    await cleanupTempDir(tempDirPath);
  });
  
  test('getWorkspaceManagerForRequest should return a workspace manager', async () => {
    // This is a minimal test to verify the helper can be called
    const workspaceName = 'test-workspace';
    const workspacePath = tempDirPath;
    
    // Just verify we can call the function without errors
    const manager = await getWorkspaceManagerForRequest(workspaceName, workspacePath);
    
    // Basic verification that we got something back
    expect(manager).toBeDefined();
  });
});
