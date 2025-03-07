import { BaseConfigManager } from './base';
import { mandrakeConfigSchema, type MandrakeConfig, type RegisteredWorkspace } from '@mandrake/utils';

export class MandrakeConfigManager extends BaseConfigManager<MandrakeConfig> {
    constructor(configPath: string) {
        super(configPath, mandrakeConfigSchema, {
            type: 'mandrake-config'
        });
    }

    /**
     * Get mandrake configuration
     */
    async getConfig(): Promise<MandrakeConfig> {
        return await this.read();
    }

    /**
     * Update mandrake configuration
     */
    async updateConfig(updates: Partial<MandrakeConfig>): Promise<void> {
        const current = await this.read();
        await this.write({ ...current, ...updates });
    }

    /**
     * Register a workspace in the configuration
     */
    async registerWorkspace(workspace: {
        id: string;
        name: string;
        path: string;
        description?: string;
        lastOpened?: string;
    }): Promise<void> {
        const config = await this.getConfig();

        if (!config.workspaces) {
            config.workspaces = [];
        }

        // Ensure the workspace ID is a valid UUID
        if (!workspace.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            workspace.id = crypto.randomUUID();
        }

        // Ensure lastOpened is a valid ISO date string
        if (!workspace.lastOpened || !workspace.lastOpened.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            workspace.lastOpened = new Date().toISOString();
        }

        // Check if workspace already exists by ID
        const existingIndex = config.workspaces.findIndex(ws => ws.id === workspace.id);

        if (existingIndex >= 0) {
            // Update existing workspace
            config.workspaces[existingIndex] = {
                ...config.workspaces[existingIndex],
                ...workspace,
            };
        } else {
            // Add new workspace
            config.workspaces.push({
                ...workspace
            });
        }

        await this.write(config);
    }

    /**
     * Unregister a workspace by ID
     */
    async unregisterWorkspaceById(id: string): Promise<RegisteredWorkspace | null> {
        const config = await this.getConfig();

        if (!config.workspaces || config.workspaces.length === 0) {
            return null;
        }

        const workspaceInfo = config.workspaces.find(ws => ws.id === id);

        if (!workspaceInfo) {
            return null;
        }

        // Remove workspace from registry
        config.workspaces = config.workspaces.filter(ws => ws.id !== id);
        await this.write(config);

        return workspaceInfo;
    }

    /**
     * Update the lastOpened timestamp for a workspace
     */
    async updateWorkspaceTimestamp(id: string): Promise<boolean> {
        const config = await this.getConfig();

        if (!config.workspaces || config.workspaces.length === 0) {
            return false;
        }

        const workspaceIndex = config.workspaces.findIndex(ws => ws.id === id);

        if (workspaceIndex >= 0) {
            config.workspaces[workspaceIndex].lastOpened = new Date().toISOString();
            await this.write(config);
            return true;
        }

        return false;
    }

    /**
     * Find a workspace by ID
     */
    async findWorkspaceById(id: string): Promise<RegisteredWorkspace | null> {
        const config = await this.getConfig();

        if (!config.workspaces || config.workspaces.length === 0) {
            return null;
        }

        return config.workspaces.find(ws => ws.id === id) || null;
    }

    /**
     * Find a workspace by name
     */
    async findWorkspaceByName(name: string): Promise<RegisteredWorkspace | null> {
        const config = await this.getConfig();

        if (!config.workspaces || config.workspaces.length === 0) {
            return null;
        }

        return config.workspaces.find(ws => ws.name === name) || null;
    }

    /**
     * List all registered workspaces
     */
    async listWorkspaces(): Promise<RegisteredWorkspace[]> {
        const config = await this.getConfig();
        return config.workspaces || [];
    }

    protected getDefaults(): MandrakeConfig {
        return {
            theme: 'system',
            telemetry: true,
            metadata: {},
            workspaces: []
        };
    }
}