import { BaseConfigManager } from './base';
import { workspaceSchema, type Workspace } from '../types';

export class WorkspaceConfigManager extends BaseConfigManager<Workspace> {
    private workspaceId: string;
    private workspaceName: string;

    constructor(configPath: string, id: string, name: string) {
        super(configPath, workspaceSchema, {
            type: 'workspace-config',
            name
        });

        this.workspaceId = id;
        this.workspaceName = name;
    }

    /**
     * Get workspace configuration
     */
    async getConfig(): Promise<Workspace> {
        return await this.read();
    }

    /**
     * Update workspace configuration
     */
    async updateConfig(updates: Partial<Workspace>): Promise<void> {
        // Ensure ID cannot be changed
        if (updates.id && updates.id !== this.workspaceId) {
            throw new Error(`Cannot change workspace ID from ${this.workspaceId} to ${updates.id}`);
        }

        const current = await this.read();
        await this.write({ ...current, ...updates });
    }

    /**
     * Override the init method to ensure ID consistency
     */
    public async init(description?: string): Promise<void> {
        const exists = await this.exists();

        if (!exists) {
            // Create new config
            const config = this.getDefaults();
            if (description) {
                config.description = description;
            }
            await this.write(config);
            this.logger.info('Created new workspace config', {
                id: this.workspaceId,
                name: this.workspaceName
            });
        } else {
            try {
                // Load existing config and check ID
                const config = await this.read();

                // Ensure ID consistency
                if (config.id !== this.workspaceId) {
                    this.logger.warn('Config ID mismatch, updating to match instance ID', {
                        configId: config.id,
                        instanceId: this.workspaceId
                    });
                    await this.updateConfig({ id: this.workspaceId });
                }
            } catch (error) {
                // If config exists but is invalid, recreate it
                this.logger.warn('Workspace config exists but is invalid, recreating', { error });
                const config = this.getDefaults();
                if (description) {
                    config.description = description;
                }
                await this.write(config);
            }
        }
    }

    protected getDefaults(): Workspace {
        return {
            id: this.workspaceId,
            name: this.workspaceName,
            created: new Date().toISOString(),
            metadata: {}
        };
    }
}