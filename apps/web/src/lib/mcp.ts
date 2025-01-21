import { DockerMCPService, createProductionConfigs } from '@mandrake/mcp';

declare global {
    var mcpService: DockerMCPService | undefined;
    var mcpInitialized: Promise<void> | undefined;
}

export const mcpService = global.mcpService || new DockerMCPService();

// Create initialization promise
global.mcpInitialized = global.mcpInitialized || mcpService.initialize(
    createProductionConfigs('/Users/johnzampolin/.mandrake/workspace')
);

// Export the initialization promise
export const mcpInitialized = global.mcpInitialized;