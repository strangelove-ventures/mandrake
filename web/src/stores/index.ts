/**
 * Store exports
 */
// System
export * from './system/global';
export * from './system/tools';
export * from './system/models';
export * from './system/prompt';

// UI
export * from './ui/layout';
export * from './ui/modals';

// Session
export * from './session/sessions';

// Workspace
export * from './workspace';

/**
 * Initialize all stores with persistent data
 */
export function initStores() {
  // Any initialization logic for stores can go here
  console.log('Initializing stores...');
  
  // We could load initial data here if needed
}