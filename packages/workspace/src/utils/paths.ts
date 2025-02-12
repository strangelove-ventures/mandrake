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
  config: string;        // ~/.mandrake/workspaces/{name}/config
  workspace: string;     // ~/.mandrake/workspaces/{name}/workspace.json
  tools: string;         // ~/.mandrake/workspaces/{name}/config/tools.json
  models: string;        // ~/.mandrake/workspaces/{name}/config/models.json
  context: string;       // ~/.mandrake/workspaces/{name}/config/context.json
  systemPrompt: string;  // ~/.mandrake/workspaces/{name}/config/system-prompt.md
  files: string;         // ~/.mandrake/workspaces/{name}/files
  src: string;           // ~/.mandrake/workspaces/{name}/src
  mcpdata: string;       // ~/.mandrake/workspaces/{name}/mcpdata
  db: string;           // ~/.mandrake/workspaces/{name}/session.db
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
  const config = join(root, 'config');

  return {
    root,
    config,
    workspace: join(root, 'workspace.json'),
    tools: join(config, 'tools.json'),
    models: join(config, 'models.json'),
    context: join(config, 'context.json'),
    systemPrompt: join(config, 'system-prompt.md'),
    files: join(root, 'files'),
    src: join(root, 'src'),
    mcpdata: join(root, 'mcpdata'),
    db: join(root, 'session.db')
  };
}