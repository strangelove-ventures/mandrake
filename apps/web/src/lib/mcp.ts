// lib/mcp.ts
import path from 'path';
import os from 'os';
import { DockerMCPService } from '@mandrake/mcp';
import { ServerConfig } from '@mandrake/types';

declare global {
    var mcpService: DockerMCPService | undefined;
}

// Create singleton service but don't initialize with any servers yet
if (!global.mcpService) {
    global.mcpService = new DockerMCPService();
}

export const mcpService = global.mcpService!;

// Helper to get workspace path
export function getWorkspacePath(workspaceName: string): string {
    return path.join(os.homedir(), '.mandrake', 'workspaces', workspaceName);
}

// Initialize servers for a workspace
export async function initWorkspaceServers(
    workspaceName: string,
    configs: ServerConfig[]
): Promise<void> {
    const workspacePath = getWorkspacePath(workspaceName);

    // Map the configs to use the correct workspace path
    const mappedConfigs = configs.map(config => ({
        ...config,
        volumes: config.volumes?.map(vol => ({
            ...vol,
            source: vol.source.replace('{workspacePath}', workspacePath)
        }))
    }));

    await mcpService.initialize(mappedConfigs);
}

// Stop all servers
export async function stopWorkspaceServers(): Promise<void> {
    await mcpService.cleanup();
}

// Get server statuses
export async function getServerStatuses(): Promise<Record<string, string>> {
    const servers = mcpService.getServers(); // This returns a Map
    const statuses: Record<string, string> = {};

    for (const [id, server] of servers) {
        try {
            await server.listTools(); // If this succeeds, server is responsive
            statuses[id] = 'running';
        } catch (err) {
            statuses[id] = 'error';
        }
    }

    return statuses;
}