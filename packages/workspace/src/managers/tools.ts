import { BaseConfigManager } from './base';
import { dirname, join, resolve, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { 
  type ToolsConfig,
  type ToolConfig,
  type ServerConfig,
  toolsConfigSchema 
} from '@mandrake/utils';

export class ToolsManager extends BaseConfigManager<ToolsConfig> {
  constructor(path: string) {
    super(path, toolsConfigSchema, { type: 'tools' });
  }

  // Config set operations
  async listConfigSets(): Promise<string[]> {
    const config = await this.read();
    return Object.keys(config.configs);
  }

  async getConfigSet(id: string): Promise<ToolConfig> {
    const config = await this.read();
    const configSet = config.configs[id];
    if (!configSet) {
      throw new Error(`Config set ${id} not found`);
    }
    return configSet;
  }

  async addConfigSet(id: string, config: ToolConfig): Promise<void> {
    const current = await this.read();
    if (current.configs[id]) {
      throw new Error(`Config set ${id} already exists`);
    }
    await this.write({
      ...current,
      configs: {
        ...current.configs,
        [id]: config,
      },
    });
  }

  async updateConfigSet(id: string, updates: Partial<ToolConfig>): Promise<void> {
    const current = await this.read();
    const configSet = current.configs[id];
    if (!configSet) {
      throw new Error(`Config set ${id} not found`);
    }

    // Merge updates with existing config, handling each server individually
    const updatedConfig = { ...configSet };
    for (const [serverId, serverUpdates] of Object.entries(updates)) {
      updatedConfig[serverId] = {
        ...(configSet[serverId] || {}),
        ...serverUpdates,
      };
    }

    await this.write({
      ...current,
      configs: {
        ...current.configs,
        [id]: updatedConfig,
      },
    });
  }

  async removeConfigSet(id: string): Promise<void> {
    const current = await this.read();
    if (!current.configs[id]) {
      throw new Error(`Config set ${id} not found`);
    }
    const { [id]: _, ...remainingConfigs } = current.configs;
    await this.write({
      ...current,
      configs: remainingConfigs,
      // Reset active if we're removing the active config set
      active: current.active === id ? 'default' : current.active,
    });
  }

  // Server config operations within a set
  async getServerConfig(setId: string, serverId: string): Promise<ServerConfig> {
    const configSet = await this.getConfigSet(setId);
    const serverConfig = configSet[serverId];
    if (!serverConfig) {
      throw new Error(`Server ${serverId} not found in config set ${setId}`);
    }
    return serverConfig;
  }

  async addServerConfig(setId: string, serverId: string, config: ServerConfig): Promise<void> {
    const current = await this.read();
    const configSet = current.configs[setId];
    if (!configSet) {
      throw new Error(`Config set ${setId} not found`);
    }
    if (configSet[serverId]) {
      throw new Error(`Server ${serverId} already exists in config set ${setId}`);
    }
    await this.write({
      ...current,
      configs: {
        ...current.configs,
        [setId]: {
          ...configSet,
          [serverId]: config,
        },
      },
    });
  }

  async updateServerConfig(
    setId: string, 
    serverId: string, 
    updates: Partial<ServerConfig>
  ): Promise<void> {
    const current = await this.read();
    const configSet = current.configs[setId];
    if (!configSet) {
      throw new Error(`Config set ${setId} not found`);
    }
    const serverConfig = configSet[serverId];
    if (!serverConfig) {
      throw new Error(`Server ${serverId} not found in config set ${setId}`);
    }
    await this.write({
      ...current,
      configs: {
        ...current.configs,
        [setId]: {
          ...configSet,
          [serverId]: { ...serverConfig, ...updates },
        },
      },
    });
  }

  async removeServerConfig(setId: string, serverId: string): Promise<void> {
    const current = await this.read();
    const configSet = current.configs[setId];
    if (!configSet) {
      throw new Error(`Config set ${setId} not found`);
    }
    if (!configSet[serverId]) {
      throw new Error(`Server ${serverId} not found in config set ${setId}`);
    }
    const { [serverId]: _, ...remainingServers } = configSet;
    await this.write({
      ...current,
      configs: {
        ...current.configs,
        [setId]: remainingServers,
      },
    });
  }

  // Active config set operations
  async getActive(): Promise<string> {
    const config = await this.read();
    return config.active;
  }

  async setActive(id: string): Promise<void> {
    const current = await this.read();
    if (!current.configs[id]) {
      throw new Error(`Config set ${id} not found`);
    }
    await this.write({
      ...current,
      active: id,
    });
  }

  /**
   * Find the ripper server script in the repo
   */
  private findRipperScript(): { command: string, scriptPath?: string } {
    // Try to find the ripper script in the repo structure
    // Start from the current directory and look up
    let currentDir = process.cwd();
    
    // Try relative paths from the workspace directory
    const workspaceDir = dirname(dirname(dirname(this.path)));
    
    // Utility to check a path and log result
    const checkPath = (path: string, logPrefix = '') => {
      if (existsSync(path)) {
        console.log(`${logPrefix}Found ripper script at: ${path}`);
        return path;
      }
      return null;
    };
    
    // Try paths relative to workspace dir
    const relPaths = [
      // Common monorepo paths
      join(workspaceDir, '../packages/ripper/dist/server.js'),
      join(workspaceDir, '../../packages/ripper/dist/server.js'),
      join(workspaceDir, '../../../packages/ripper/dist/server.js'),
      
      // Try paths relative to cwd
      join(currentDir, 'packages/ripper/dist/server.js'),
      join(currentDir, '../packages/ripper/dist/server.js'),
      join(currentDir, '../../packages/ripper/dist/server.js'),
      
      // Try node_modules paths
      join(workspaceDir, 'node_modules/@mandrake/ripper/dist/server.js'),
      join(currentDir, 'node_modules/@mandrake/ripper/dist/server.js')
    ];
    
    // Check all relative paths
    for (const path of relPaths) {
      const found = checkPath(path);
      if (found) return { command: 'bun', scriptPath: found };
    }
    
    // Try walking up directories
    while (currentDir !== dirname(currentDir)) {
      const ripperPath = join(currentDir, 'packages/ripper/dist/server.js');
      const found = checkPath(ripperPath);
      if (found) return { command: 'bun', scriptPath: found };
      
      currentDir = dirname(currentDir);
    }
    
    // If we didn't find the built version, try the source version
    currentDir = process.cwd();
    while (currentDir !== dirname(currentDir)) {
      const ripperPath = join(currentDir, 'packages/ripper/src/server.ts');
      const found = checkPath(ripperPath);
      if (found) return { command: 'bun', scriptPath: found };
      
      currentDir = dirname(currentDir);
    }
    
    // If we reach here, we couldn't find the script - use ripper-server from PATH
    return { command: 'ripper-server' };
  }
  
  protected getDefaults(): ToolsConfig {
    const configDir = dirname(this.path);
    const wsDir = dirname(configDir);
    const workspacePath = dirname(wsDir);
    
    // Try to find ripper script in repo first - this works better in dev environments
    const ripperScript = this.findRipperScript();
    
    // If we found a script, use bun to run it, otherwise fall back to ripper-server
    let ripperConfig: ServerConfig;
    
    if (ripperScript.scriptPath) {
      ripperConfig = {
        command: 'bun',
        args: [
          ripperScript.scriptPath,
          '--transport=stdio',
          `--workspaceDir=${workspacePath}`,
          '--excludePatterns=\\.ws'
        ]
      };
    } else {
      // Fall back to using ripper-server from PATH
      ripperConfig = {
        command: 'ripper-server',
        args: [
          '--transport=stdio',
          `--workspaceDir=${workspacePath}`,
          '--excludePatterns=\\.ws'
        ]
      };
    }

    return {
      active: 'default',
      configs: {
        // The default tool set is ripper and fetch
        // we should consider adding search and other tools here
        default: {
          ripper: ripperConfig
        },
        // The system tool set is to make changes to the workspace
        // We should consider adding other useful system tools
        system: {
          workspace: {
            command: 'bun',
            args: [
              'run',
              '../workspace-tools/dist/server.js',
              '--transport=stdio',
              `--workspaceDir=${workspacePath}`
            ]
          }
        }
      },
    };
  }

  // Utility method to create a server config with ripper-server from PATH
  async createRipperServerConfig(workspacePath: string): Promise<ServerConfig> {
    // Use the smart detection
    const ripperScript = this.findRipperScript();
    
    if (ripperScript.scriptPath) {
      return {
        command: 'bun',
        args: [
          ripperScript.scriptPath,
          '--transport=stdio',
          `--workspaceDir=${workspacePath}`,
          '--excludePatterns=\\.ws'
        ]
      };
    } else {
      return {
        command: 'ripper-server',
        args: [
          '--transport=stdio',
          `--workspaceDir=${workspacePath}`,
          '--excludePatterns=\\.ws'
        ]
      };
    }
  }
}