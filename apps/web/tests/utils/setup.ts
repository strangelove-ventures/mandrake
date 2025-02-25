/**
 * Test setup utilities
 */

/**
 * Reset the ServiceRegistry singleton for test isolation
 * 
 * Note: Instead of directly assigning to the singleton, we'll add an export
 * in the registry module specifically for testing.
 */
export function resetServiceRegistry() {
  // Alternatively, if the above doesn't work:
  // Clear the require cache for the registry module
  // This forces a fresh import next time it's required
  delete require.cache[require.resolve('../../src/lib/services/registry')];
}