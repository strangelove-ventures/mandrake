import type { ServerConfig } from '../types'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { existsSync } from 'fs'

export class TransportFactory {
    static create(config: ServerConfig): StdioClientTransport | SSEClientTransport {
        console.log(`[TransportFactory] Creating transport for command: ${config.command}`);
        console.log(`[TransportFactory] Args:`, config.args);
        
        if (config.command.startsWith('http')) {
            console.log(`[TransportFactory] Creating SSE transport for URL: ${config.command}`);
            try {
                const url = new URL(config.command);
                return new SSEClientTransport(url);
            } catch (error) {
                console.error(`[TransportFactory] Invalid URL: ${config.command}`, error);
                throw new Error(`Invalid URL: ${config.command}`);
            }
        }

        // Check if the command exists
        if (!config.command.includes('/') && !config.command.includes('\\')) {
            // It's just a command name, assume it's in PATH
            console.log(`[TransportFactory] Using command from PATH: ${config.command}`);
        } else {
            // It's a path, check if it exists
            if (!existsSync(config.command)) {
                console.error(`[TransportFactory] Command file not found: ${config.command}`);
                throw new Error(`Command file not found: ${config.command}`);
            }
            console.log(`[TransportFactory] Command file exists: ${config.command}`);
        }

        // Otherwise use stdio
        console.log(`[TransportFactory] Creating StdioClientTransport`);
        return new StdioClientTransport({
            command: config.command,
            args: config.args || [],
            env: config.env,
            stderr: 'pipe'
        })
    }
}