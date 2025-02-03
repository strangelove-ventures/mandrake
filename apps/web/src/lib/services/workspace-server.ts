import { WorkspaceFullConfig } from '@mandrake/types';
import { logger } from '@mandrake/types';

const serverLogger = logger.child({ service: 'workspace-server' });

class WorkspaceServerManager {
    private activeWorkspace?: string;

    async getServer(id: string) {
        // In browser context, server operations should be handled through API
        return null;
    }

    async switchWorkspace(id: string, config: WorkspaceFullConfig) {
        serverLogger.info('Workspace switching handled through API', {
            workspace: id
        });
    }

    async validateAndReconcile(id: string, config: WorkspaceFullConfig) {
        serverLogger.info('Server validation handled through API', {
            workspace: id
        });
    }

    getServerStatuses(): Record<string, string> {
        // In browser context, statuses should be fetched through API
        return {};
    }
}

export const workspaceServerManager = new WorkspaceServerManager();