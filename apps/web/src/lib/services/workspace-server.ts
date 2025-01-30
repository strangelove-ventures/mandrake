import { DockerMCPService } from '@mandrake/mcp';
import { WorkspaceFullConfig } from '@mandrake/types';
import { logger } from '@mandrake/types';

const serverLogger = logger.child({ service: 'workspace-server' });

class WorkspaceServerManager {
    private mcpService = new DockerMCPService(serverLogger);
    private activeWorkspace?: string;

    async getServer(id: string) {
        return this.mcpService.getServer(id);
    }
    async switchWorkspace(id: string, config: WorkspaceFullConfig) {
        serverLogger.info('Switching workspace servers', {
            newWorkspace: id,
            currentWorkspace: this.activeWorkspace,
            toolsConfig: config.tools // Log full config
        });

        if (this.activeWorkspace && this.activeWorkspace !== id) {
            serverLogger.info('Cleaning up old workspace servers');
            await this.mcpService.cleanup();
        }

        if (!config.tools?.tools?.length) {
            serverLogger.warn('No tools configured for workspace');
            return;
        }

        if (this.activeWorkspace !== id) {
            this.activeWorkspace = id;
            serverLogger.info('Initializing new workspace servers', {
                workspace: id,
                toolCount: config.tools.tools.length
            });
            await this.mcpService.initialize(config.tools.tools);
        }
    }

    async validateAndReconcile(id: string, config: WorkspaceFullConfig) {
        serverLogger.info('Validating workspace servers', { workspace: id });

        // Get current server states
        const currentStates = this.mcpService.getServerStatuses();
        const desiredServers = new Set(config.tools.tools.map(s => s.id));

        // Check for servers that shouldn't be running
        const runningServers = Object.keys(currentStates);
        const serversToRemove = runningServers.filter(id => !desiredServers.has(id));

        // Check for mismatched configs or failed servers
        const serversToRecreate = config.tools.tools.filter(server => {
            const currentState = currentStates[server.id];
            return currentState === 'error' || !currentState;
        });

        // Log reconciliation plan
        serverLogger.info('Server reconciliation plan', {
            workspace: id,
            serversToRemove,
            serversToRecreate: serversToRecreate.map(s => s.id)
        });

        // Reconcile if needed
        if (serversToRemove.length > 0 || serversToRecreate.length > 0) {
            serverLogger.info('Reconciling workspace servers', { workspace: id });
            await this.mcpService.cleanup();
            await this.mcpService.initialize(config.tools.tools);
        }
    }

    getServerStatuses(): Record<string, string> {
        return this.mcpService.getServerStatuses();
    }
}

export const workspaceServerManager = new WorkspaceServerManager();