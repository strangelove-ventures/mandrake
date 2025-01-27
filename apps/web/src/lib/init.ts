import { ensureDefaultWorkspace, prisma } from '@mandrake/storage';

declare global {
  var dbInitialized: Promise<string> | undefined;
}

if (!global.dbInitialized) {
  console.log('Initializing DB workspace...'); 
  global.dbInitialized = ensureDefaultWorkspace()
    .then(workspace => {
      console.log('Default workspace initialized:', workspace);
      return workspace.id;
    })
    .catch(error => {
      console.error('Failed to initialize workspace:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      throw error;
    });
}

console.log('init.ts: Setting up dbInitialized');
export const dbInitialized = global.dbInitialized!;