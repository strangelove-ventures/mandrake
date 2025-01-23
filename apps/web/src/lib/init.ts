// src/lib/init.ts
import { ensureDefaultWorkspace } from '@mandrake/storage';
import { prisma } from './db';

declare global {
  var dbInitialized: Promise<string> | undefined;
}

if (!global.dbInitialized) {
  global.dbInitialized = ensureDefaultWorkspace()
    .then(workspace => {
      console.log('Default workspace initialized:', workspace.id);
      return workspace.id;
    })
    .catch(error => {
      console.error('Failed to initialize workspace:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    });
}

export const dbInitialized = global.dbInitialized!;