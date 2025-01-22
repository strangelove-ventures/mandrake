import { DockerMCPService, createProductionConfigs } from '@mandrake/mcp';
import * as os from 'os';
import * as path from 'path';

declare global {
    var mcpService: DockerMCPService | undefined;
    var mcpInitialized: Promise<void> | undefined;
}

// Get user's home directory and construct workspace path
const workspacePath = path.join(os.homedir(), '.mandrake', 'workspace');

if (!global.mcpService) {
    global.mcpService = new DockerMCPService();
    global.mcpInitialized = global.mcpService.initialize(
        createProductionConfigs(workspacePath)
    );
}

export const mcpService = global.mcpService!;
export const mcpInitialized = global.mcpInitialized!;