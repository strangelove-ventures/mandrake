import type { ServerConfig } from '../types'
import { TransportType } from '@mandrake/utils/src/types/mcp'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { createLogger } from '@mandrake/utils';
import { existsSync } from 'fs'

export class TransportFactory {
    private static logger = createLogger('mcp').child({
        meta: { component: 'transport-factory' }
    });
    static create(config: ServerConfig): StdioClientTransport | SSEClientTransport {
        this.logger.info(`Creating transport for tool`, { "command": config.command, "args": config.args });
        if (config.command.startsWith('http')) {
            try {
                const url = new URL(config.command);
                return new SSEClientTransport(url);
            } catch (error) {
                throw new Error(`Invalid URL: ${config.command}`);
            }
        }

        // Check if the command exists
        if (!config.command.includes('/') && !config.command.includes('\\')) {
        } else {
            // It's a path, check if it exists
            if (!existsSync(config.command)) {
                throw new Error(`Command file not found: ${config.command}`);
            }
        }
        return new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env: config.env,
            stderr: 'pipe'
        })
    }
}