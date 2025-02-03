// Browser-safe exports for the MCP package
import type { Tool } from './types';

// Simplified browser-safe version of the MCP service
export class BrowserMCPService {
    private tools: Tool[] = [];

    async getTools(): Promise<Tool[]> {
        // In browser context, tools should be fetched from an API endpoint
        // For now, return empty array
        return this.tools;
    }

    getToolServer(name: string) {
        // In browser context, tool invocation should be handled through API
        return null;
    }
}

export const mcpService = new BrowserMCPService();