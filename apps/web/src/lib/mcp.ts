// apps/web/src/lib/mcp.ts
import path from 'path';
import os from 'os';

// Helper to get workspace path
export function getWorkspacePath(workspaceName: string): string {
    return path.join(os.homedir(), '.mandrake', 'workspaces', workspaceName);
}