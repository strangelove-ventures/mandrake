/**
 * Service initialization module
 */
import { getServiceRegistry } from './registry';
import { createLogger } from '@mandrake/utils';

const logger = createLogger('ServiceInit');

// Global state to track initialization
let isInitialized = false;
let cleanupInterval: NodeJS.Timer | null = null;

/**
 * Initialize the service registry and set up cleanup intervals
 */
export async function initializeServices(): Promise<void> {
  if (isInitialized) {
    return;
  }
  
  logger.info('Initializing Mandrake service registry...');
  
  // Set up periodic cleanup
  const registry = getServiceRegistry();
  
  // Set up cleanup interval (every 15 minutes)
  cleanupInterval = setInterval(() => {
    registry.performCleanup().catch(err => {
      logger.error('Error during service cleanup:', err);
    });
  }, 15 * 60 * 1000);
  
  // Handle shutdown
  setupShutdownHandlers();
  
  isInitialized = true;
  logger.info('Mandrake service registry initialized');
}

/**
 * Set up handlers for graceful shutdown
 */
function setupShutdownHandlers(): void {
  const cleanup = async () => {
    logger.info('Mandrake services shutting down...');
    
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
    
    // Add additional cleanup logic here if needed
    logger.info('Mandrake services shutdown complete');
  };
  
  // Handle Node.js process termination
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  
  // Handle Next.js middleware termination if applicable
  if (typeof window === 'undefined') {
    // We're in a server context
    process.on('beforeExit', async () => {
      await cleanup();
    });
  }
}
