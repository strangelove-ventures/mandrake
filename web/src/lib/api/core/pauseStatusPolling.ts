/**
 * Global mechanism to pause all server status polling across the application
 */

// Global state to track if polling should be paused
let isPaused = false;

// Keep track of original fetch function
let originalFetch: typeof fetch | null = null;

/**
 * Check if polling is currently paused
 */
export function isStatusPollingPaused(): boolean {
  return isPaused;
}

/**
 * Pause all server status polling
 */
export function pauseStatusPolling(): void {
  if (isPaused) return; // Already paused
  isPaused = true;
  
  // Replace global fetch with our patched version if in browser
  if (typeof window !== 'undefined' && !originalFetch) {
    originalFetch = window.fetch;
    
    // Replace with patched version that blocks status API calls
    window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      // Check if this is a status API call
      const url = input instanceof Request ? input.url : input.toString();
      
      if (
        isPaused && 
        (url.includes('/tools/servers/status') || url.includes('/tools/operations/server'))
      ) {
        console.log('🛑 Blocking status API call while paused:', url);
        
        // Return a mock response
        return Promise.resolve(new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      