// apps/web/src/lib/mcp.ts
import { DockerMCPService, createProductionConfigs } from '@mandrake/mcp';

declare global {
    var mcpService: DockerMCPService | undefined;
    var mcpInitialized: Promise<void> | undefined;
}

// Initialize immediately when this module is loaded on the server
if (!global.mcpService) {
    global.mcpService = new DockerMCPService();
    global.mcpInitialized = global.mcpService.initialize(
        createProductionConfigs('/Users/johnzampolin/.mandrake/workspace')
    );
}

export const mcpService = global.mcpService!;
export const mcpInitialized = global.mcpInitialized!;