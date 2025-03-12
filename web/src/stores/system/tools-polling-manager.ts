/**
 * Helper module to manage tools polling globally
 * This allows different components to coordinate polling without interfering with each other
 */

// Define a global variable to store the current polling state
type PollingState = {
  isPolling: boolean;
  intervalId: NodeJS.Timeout | null;
  lastPollTime: number;
  pollingInterval: number;
};

// Default to 10 seconds
const DEFAULT_POLLING_INTERVAL = 10000;

// Initialize with default values
let pollingState: PollingState = {
  isPolling: false,
  intervalId: null,
  lastPollTime: 0,
  pollingInterval: DEFAULT_POLLING_INTERVAL,
};

/**
 * Start polling with the provided callback
 */
export function startPolling(callback: () => void, intervalMs: number = DEFAULT_POLLING_INTERVAL): void {
  // Stop any existing polling first
  stopPolling();
  
  // Set up new polling
  pollingState = {
    isPolling: true,
    intervalId: setInterval(callback, intervalMs),
    lastPollTime: Date.now(),
    pollingInterval: intervalMs,
  };
  
  // Execute callback once immediately
  callback();
}

/**
 * Stop the current polling
 */
export function stopPolling(): void {
  if (pollingState.intervalId) {
    clearInterval(pollingState.intervalId);
  }
  
  pollingState = {
    ...pollingState,
    isPolling: false,
    intervalId: null,
  };
}

/**
 * Manually trigger a poll and update lastPollTime
 */
export function manualPoll(callback: () => void): void {
  pollingState.lastPollTime = Date.now();
  callback();
}

/**
 * Get the current polling state
 */
export function getPollingState(): PollingState {
  return { ...pollingState };
}

/**
 * Check if polling is active
 */
export function isPolling(): boolean {
  return pollingState.isPolling;
}

/**
 * Set a custom polling interval
 * If polling is already active, restarts it with the new interval
 */
export function setPollingInterval(intervalMs: number, callback?: () => void): void {
  const wasPolling = pollingState.isPolling;
  const prevCallback = callback;
  
  // Stop current polling
  stopPolling();
  
  // Update interval
  pollingState.pollingInterval = intervalMs;
  
  // Restart if it was previously running and a callback is provided
  if (wasPolling && callback) {
    startPolling(callback, intervalMs);
  }
}
