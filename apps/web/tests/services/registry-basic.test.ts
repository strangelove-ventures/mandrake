/**
 * Basic test for ServiceRegistry
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { getServiceRegistry } from '../../src/lib/services/registry';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('ServiceRegistry', () => {
  // Create a new temporary directory for each test
  let tempDirPath: string;
  
  beforeEach(async () => {
    // Create a fresh temporary directory
    tempDirPath = await mkdtemp(join(tmpdir(), 'mandrake-test-'));
    
    // Clear the registry singleton (assuming it uses a non-readonly property)
    try {
      // This is a safer way to reset modules between tests
      delete require.cache[require.resolve('../../src/lib/services/registry')];
    } catch (error) {
      console.warn('Could not reset registry module', error);
    }
  });
  
  afterEach(async () => {
    // Clean up the temporary directory
    try {
      await rm(tempDirPath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Could not clean up temp directory', error);
    }
  });
  
  test('should be a singleton', () => {
    // Get the registry twice
    const registry1 = getServiceRegistry();
    const registry2 = getServiceRegistry();
    
    // Verify it's the same instance
    expect(registry1).toBe(registry2);
  });
  
  test('should provide methods for managing resources', () => {
    const registry = getServiceRegistry();
    
    // Just verify the basic interface exists
    expect(typeof registry.getWorkspaceManager).toBe('function');
    expect(typeof registry.getMCPManager).toBe('function');
    expect(typeof registry.getSessionCoordinator).toBe('function');
    expect(typeof registry.releaseSessionCoordinator).toBe('function');
    expect(typeof registry.releaseWorkspaceResources).toBe('function');
    expect(typeof registry.performCleanup).toBe('function');
  });
});
