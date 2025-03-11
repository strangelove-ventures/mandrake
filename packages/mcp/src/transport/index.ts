import type { ServerConfig } from '../types'
import { TransportType } from '@mandrake/utils/src/types/mcp'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { createLogger } from '@mandrake/utils';
import { existsSync } from 'fs'
import os from 'os'
import { join } from 'path'

export class TransportFactory {
    private static logger = createLogger('mcp').child({
        meta: { component: 'transport-factory' }
    });
    static create(config: ServerConfig): StdioClientTransport | SSEClientTransport {
        // Process command and args for path expansion
        const command = config.command;
        let args = config.args ? [...config.args] : [];
        
        // Expand any paths in the args that start with tilde
        args = args.map(arg => {
            if (typeof arg === 'string' && arg.startsWith('~')) {
                const expanded = join(os.homedir(), arg.substring(1));
                this.logger.info(`Expanded path argument: ${arg} -> ${expanded}`);
                return expanded;
            }
            return arg;
        });
        
        this.logger.info(`Creating transport for tool`, { command, args });
        
        if (command.startsWith('http')) {
            try {
                const url = new URL(command);
                return new SSEClientTransport(url);
            } catch (error) {
                throw new Error(`Invalid URL: ${command}`);
            }
        }

        // Check if the command exists
        if (!command.includes('/') && !command.includes('\\')) {
            // It's a command name, assume it's in PATH
        } else {
            // It's a path, check if it exists
            if (!existsSync(command)) {
                throw new Error(`Command file not found: ${command}`);
            }
        }
        
        return new StdioClientTransport({
            command: command,
            args: args,
            env: config.env,
            stderr: 'pipe'
        })
    }
}