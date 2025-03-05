'use server';

import { getServiceRegistry } from '@/server/services';

// Singleton to track initialization state
let servicesInitialized = false;
let initError: Error | null = null;

/**
 * Initialize the services registry and ensure it's ready for API calls
 * 
 * This function should be called at the beginning of each API route handler
 * to ensure services are properly initialized before proceeding.
 */
export async function ensureServicesReady() {
  // If we've already tried to initialize and failed, throw the error
  if (initError) {
    throw initError;
  }
  
  // If already initialized, return immediately
  if (servicesInitialized) {
    return;
  }
  
  try {
    console.log('Initializing service registry');
    
    // Get the registry (this will initialize it if not already done)
    const registry = getServiceRegistry();
    
    // Verify the registry by getting the mandrake manager
    // This will throw if there's a problem
    await registry.getMandrakeManager();
    
    // Mark as initialized
    servicesInitialized = true;
    console.log('Service registry initialized successfully');
  } catch (error) {
    console.error('Failed to initialize service registry', error);
    
    // Store the error for future calls
    initError = error instanceof Error 
      ? error 
      : new Error(`Failed to initialize services: ${ error } `);
    
    // Re-throw the error
    throw initError;
  }
}

/**
 * Reset the initialization state (mainly for testing)
 */
export async function resetServicesInitialization() {
  servicesInitialized = false;
  initError = null;
}