/**
 * Mandrake API Client
 * 
 * Provides a typed interface to interact with the Mandrake backend API.
 */

// Export the core utilities
export * from './core/fetcher';
export * from './core/errors';
export * from './core/streaming';
export * from './core/types';

// Import resource clients
import { workspaces } from './resources/workspaces';
import { sessions } from './resources/sessions';
import { files } from './resources/files';
import { tools } from './resources/tools';
import { models } from './resources/models';
import { prompt } from './resources/prompt';
import { dynamic } from './resources/dynamic';
import { system } from './resources/system';

/**
 * Unified API client object
 */
export const api = {
  workspaces,
  sessions,
  files,
  tools,
  models,
  prompt,
  dynamic,
  system,
};