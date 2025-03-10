/**
 * Store exports
 */
import { initWorkspaceStore } from './workspaceStore';
import { initSessionStore } from './sessionStore';

export * from './workspaceStore';
export * from './sessionStore';

/**
 * Initialize all stores with persistent data
 */
export function initStores() {
  initWorkspaceStore();
  initSessionStore();
}