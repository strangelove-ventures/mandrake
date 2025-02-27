import { createLogger, type Logger } from '@mandrake/utils';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { ToolsManager } from './tools';
import { ModelsManager } from './models';
import { PromptManager } from './prompt';
import { DynamicContextManager } from './dynamic';
import { FilesManager } from './files';
import { getWorkspacePath, type WorkspacePaths } from '../utils/paths';
import { SessionManager } from './session';
import { WorkspaceConfigManager } from './workspaceConfig';

export class WorkspaceManager {
  public readonly paths: WorkspacePaths;
  public readonly tools: ToolsManager;
  public readonly models: ModelsManager;
  public readonly prompt: PromptManager;
  public readonly dynamic: DynamicContextManager;
  public readonly files: FilesManager;
  public readonly sessions: SessionManager;
  public readonly config: WorkspaceConfigManager;
  public readonly logger: Logger;
  public readonly name: string;
  public readonly id: string;

  constructor(path: string, name: string, id: string) {
    const paths = getWorkspacePath(path, name);
    this.name = name;
    this.id = id;
    this.paths = paths;
    
    this.logger = createLogger('workspace').child({
      meta: {
        component: 'manager',
        name,
        id
      }
    });

    // Initialize sub-managers
    this.tools = new ToolsManager(paths.tools);
    this.models = new ModelsManager(paths.models);
    this.prompt = new PromptManager(paths.systemPrompt);
    this.dynamic = new DynamicContextManager(paths.context);
    this.files = new FilesManager(paths.files);
    this.sessions = new SessionManager(paths.db);
    this.config = new WorkspaceConfigManager(paths.workspace, id, name);
  }

  /**
   * Initialize workspace directory structure and configs
   */
  async init(description?: string): Promise<void> {
    this.logger.info('Initializing workspace', { path: this.paths.root });

    await Promise.all([
      // ensure root directory
      mkdir(this.paths.root, { recursive: true }),
      // ensure {root}/.ws directory
      mkdir(this.paths.wsDir, { recursive: true }),
      // ensure {root}/.ws/config directory
      mkdir(this.paths.config, { recursive: true }),
      // ensure {root}/.ws/mcpdata directory
      mkdir(this.paths.mcpdata, { recursive: true })
    ]);

    // Initialize files and sessions
    await Promise.all([
      this.tools.init(),
      this.models.init(),
      this.prompt.init(),
      this.dynamic.init(),
      this.files.init(),
      this.sessions.init(),
      this.config.init(description),
    ]);
    this.logger.info('Workspace initialized');
  }
}
