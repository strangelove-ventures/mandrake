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


  protected getDefaults(): ToolsConfig {
    const configDir = dirname(this.path);
    const wsDir = dirname(configDir);
    const workspacePath = dirname(wsDir);

    return {
      active: 'default',
      configs: {
        // Default tool set uses Docker-based MCP servers
        default: {
          filesystem: {
            command: 'docker',
            args: [
              'run',
              '--rm',
              '-i',
              '--mount',
              `type=bind,src=${workspacePath},dst=/workspace`,
              'mcp/filesystem',
              '/workspace'
            ]
          },
          fetch: {
            command: 'docker',
            args: [
              'run',
              '--rm',
              '-i',
              'mcp/fetch'
            ]
          },
          memory: {
            command: 'docker',
            args: [
              'run',
              '-i',
              '-v',
              'claude-memory:/app/dist',
              '--rm',
              'mcp/memory'
            ]
          }
        },
        // TODO: system tooling
        system: {}
      },
    };
  }
}