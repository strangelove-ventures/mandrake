import { createLogger } from '@mandrake/utils';
import { mkdir } from 'fs/promises';
import { ToolsManager } from './tools';
import { ModelsManager } from './models';
import { PromptManager } from './prompt';
import { DynamicContextManager } from './dynamic';
import { BaseConfigManager } from './base';
import { getWorkspacePath, type WorkspacePaths } from '../utils/paths';
import { SessionManager } from './session';
import { workspaceSchema, type Workspace } from '../types';

export class WorkspaceManager extends BaseConfigManager<Workspace> {
  public readonly paths: WorkspacePaths;
  public readonly tools: ToolsManager;
  public readonly models: ModelsManager;
  public readonly prompt: PromptManager;
  public readonly dynamic: DynamicContextManager;
  public readonly sessions: SessionManager;

  constructor(workspaceDir: string, name: string) {
    const paths = getWorkspacePath(workspaceDir, name);
    super(paths.workspace, workspaceSchema, { 
      type: 'workspace-config',
      name 
    });

    this.paths = paths;
    this.logger = createLogger('workspace').child({
      meta: {
        component: 'workspace-manager',
        workspace: name
      }
    });

    // Initialize sub-managers
    this.tools = new ToolsManager(paths.tools);
    this.models = new ModelsManager(paths.models);
    this.prompt = new PromptManager(paths.systemPrompt);
    this.dynamic = new DynamicContextManager(paths.context);
    this.sessions = new SessionManager(paths.db);
  }

  /**
   * Initialize workspace directory structure and configs
   */
  async init(description?: string): Promise<void> {
    this.logger.info('Initializing workspace', { path: this.paths.root });

    // Create directory structure
    await Promise.all([
      mkdir(this.paths.root, { recursive: true }),
      mkdir(this.paths.config, { recursive: true }),
      mkdir(this.paths.files, { recursive: true }),
      mkdir(this.paths.src, { recursive: true }),
      mkdir(this.paths.mcpdata, { recursive: true })
    ]);

    // Initialize sessions
    await this.sessions.init();

    // Write initial workspace config
    const config: Workspace = {
      id: crypto.randomUUID(),
      name: this.paths.root.split('/').pop()!,
      description,
      created: new Date().toISOString(),
      metadata: {}
    };
    await this.write(config);

    // Initialize sub-managers with defaults
    await Promise.all([
      this.tools.list(),      // Creates tools.json if doesn't exist
      this.models.get(),      // Creates models.json if doesn't exist
      this.prompt.get(),      // Creates system-prompt.md if doesn't exist
      this.dynamic.list()     // Creates context.json if doesn't exist
    ]);

    this.logger.info('Workspace initialized');
  }

  /**
   * Get workspace config
   */
  async getConfig(): Promise<Workspace> {
    return this.read();
  }

  /**
   * Update workspace config
   */
  async updateConfig(updates: Partial<Workspace>): Promise<void> {
    const current = await this.read();
    await this.write({ ...current, ...updates });
  }

  protected getDefaults(): Workspace {
    throw new Error('Workspace must be initialized with init()');
  }
}