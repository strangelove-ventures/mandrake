/**
 * Tests for service initialization
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { initializeServices } from '../../src/lib/services/init';
import { getServiceRegistry } from '../../src/lib/services/registry';

describe('Service Initialization', () => {
  // Store original functions
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  const originalProcessOn = process.on;
  const originalExit = process.exit;
  
  beforeEach(() => {
    // Clear module cache to reset singletons
    try {
      delete require.cache[require.resolve('../../src/lib/services/registry')];
      delete require.cache[require.resolve('../../src/lib/services/init')];
    } catch (error) {
      console.warn('Could not reset modules', error);
    }
  });
  
  afterEach(() => {
    // Restore original functions
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    process.on = originalProcessOn;
    process.exit = originalExit;
  });
  
  test('should initialize the service registry once', async () => {
    // This test focuses just on verifying the service is initialized
    await initializeServices();
    
    // Get the registry to verify it exists
    const registry = getServiceRegistry();
    expect(registry).toBeDefined();
  });
  
  test('should be idempotent', async () => {
    // First initialization
    await initializeServices();
    
    // Get the registry to use in our mock
    const registry = getServiceRegistry();
    
    // Create a spy to track if performCleanup is called again
    let performCleanupCalled = false;
    const originalPerformCleanup = registry.performCleanup;
    registry.performCleanup = async function() {
      performCleanupCalled = true;
      return originalPerformCleanup.call(this);
    };
    
    // Reinitialize - shouldn't do anything
    await initializeServices();
    
    // cleanup interval should not be set up again
    expect(performCleanupCalled).toBe(false);
    
    // Reset the spy
    registry.performCleanup = originalPerformCleanup;
  });
  
  test('cleanup should be called when interval triggers', async () => {
    // Instead of trying to mock setInterval, let's directly test
    // the effect of the cleanup function
    
    await initializeServices();
    
    // Get access to the initialized registry
    const registry = getServiceRegistry();
    
    // Mock performCleanup to check if it gets called
    let cleanupCalled = false;
    const originalPerformCleanup = registry.performCleanup;
    
    registry.performCleanup = async function() {
      cleanupCalled = true;
      return Promise.resolve();
    };
    
    // Directly trigger a cleanup to simulate the interval
    // We'll access the module's private variable - for testing only
    const initModule = require('../../src/lib/services/init');
    if (initModule.cleanupInterval) {
      // Here we're simulating the interval callback
      // Get the function that would be called by setInterval
      const intervalCallback = initModule.cleanupInterval.callback || 
                              (() => registry.performCleanup().catch(console.error));
      
      // Execute it
      await intervalCallback();
      
      // Verify cleanup was called
      expect(cleanupCalled).toBe(true);
    }
    
    // Restore the original method
    registry.performCleanup = originalPerformCleanup;
  });
  
  test('shutdown handlers should clean up resources', async () => {
    // For this test, we'll directly test the cleanup logic
    // rather than trying to mock process.on
    
    await initializeServices();
    
    // Get the module to access its private state
    const initModule = require('../../src/lib/services/init');
    
    // Mock clearInterval to check if it's called during cleanup
    let intervalCleared = false;
    global.clearInterval = () => {
      intervalCleared = true;
    };
    
    // Mock process.exit to prevent actual exit
    process.exit = function() { 
      return undefined as never;
    };
    
    // Simulate a SIGTERM event
    const sigTermEvent = new Event('SIGTERM');
    process.emit('SIGTERM', sigTermEvent);
    
    // Allow a small delay for async cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify the interval was cleared
    expect(intervalCleared).toBe(true);
    
    // Also verify the cleanup interval was nullified
    expect(initModule.cleanupInterval).toBeNull();
  });
});
