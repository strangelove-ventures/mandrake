import { join } from 'path';
import os from 'os';

export function getMandrakeDir(): string {
  return join(process.env.MANDRAKE_DIR || os.homedir(), '.mandrake');
}

export function getWorkspacesDir(): string {
  return join(getMandrakeDir(), 'workspaces');
}

export interface MandrakePaths {
  root: string;          // ~/.mandrake
  config: string;        // ~/.mandrake/mandrake.json
  tools: string;         // ~/.mandrake/tools.json
  models: string;        // ~/.mandrake/models.json
  prompt: string;        // ~/.mandrake/prompt.json
  db: string;           // ~/.mandrake/mandrake.db
}

export interface WorkspacePaths {
  root: string;          // ~/.mandrake/workspaces/{name}
  wsDir: string;         // ~/.mandrake/workspaces/{name}/.ws
  config: string;        // ~/.mandrake/workspaces/{name}/.ws/config
  workspace: string;     // ~/.mandrake/workspaces/{name}/.ws/workspace.json
  tools: string;         // ~/.mandrake/workspaces/{name}/.ws/config/tools.json
  models: string;        // ~/.mandrake/workspaces/{name}/.ws/config/models.json
  context: string;       // ~/.mandrake/workspaces/{name}/.ws/config/context.json
  systemPrompt: string;  // ~/.mandrake/workspaces/{name}/.ws/config/prompt.json
  files: string;         // ~/.mandrake/workspaces/{name}/.ws/files
  mcpdata: string;       // ~/.mandrake/workspaces/{name}/.ws/mcpdata
  db: string;           // ~/.mandrake/workspaces/{name}/.ws/session.db
}

export function getMandrakePaths(root: string): MandrakePaths {  
  return {
    root,
    config: join(root, 'mandrake.json'),
    tools: join(root, 'tools.json'),
    models: join(root, 'models.json'),
    prompt: join(root, 'prompt.json'),
    db: join(root, 'mandrake.db')
  };
}

export function getWorkspacePath(workspaceDir: string, name: string): WorkspacePaths {
  const root = join(workspaceDir, name);
  const wsDir = join(root, '.ws');
  const config = join(wsDir, 'config');
  return {
    root,
    wsDir,
    config,
    workspace: join(config, 'workspace.json'),
    tools: join(config, 'tools.json'),
    models: join(config, 'models.json'),
    context: join(config, 'context.json'),
    systemPrompt: join(config, 'prompt.json'),
    files: join(wsDir, 'files'),
    mcpdata: join(wsDir, 'mcpdata'),
    db: join(wsDir, 'session.db')
  };
}