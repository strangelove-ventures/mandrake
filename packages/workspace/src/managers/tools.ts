import { BaseConfigManager } from './base';
import { dirname } from 'path';
import { 
  type ToolsConfig,
  type ToolConfig,
  type ServerConfig,
  toolsConfigSchema 
} from '../types/workspace/tools';

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

  protected getDefaults(): ToolsConfig {
    const configDir = dirname(this.path);
    const wsDir = dirname(configDir);
    const workspacePath = dirname(wsDir);
    return {
      active: 'default',
      configs: {
        // The default tool set is ripper and fetch
        // we should consider adding search and other tools here
        default: {
          ripper: {
            command: 'bun',
            args: [
              'run',
              '../ripper/dist/server.js',
              '--transport=stdio',
              `--workspaceDir=${workspacePath}`,
              '--excludePatterns=\\.ws'
            ]
          },
          fetch: {
            command: 'mcp-fetch-server'
          }
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
}
