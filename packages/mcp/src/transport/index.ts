import type { ServerConfig } from '../types'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

export class TransportFactory {
    static create(config: ServerConfig): StdioClientTransport | SSEClientTransport {
        // If command includes 'http' or 'https', assume SSE
        if (config.command.startsWith('http')) {
            let foo = URL.parse("http://localhost:8080")
            if (!foo) {
                throw new Error('Invalid URL')
            }
            return new SSEClientTransport(foo)
        }

        // Otherwise use stdio
        return new StdioClientTransport(config)
    }
}
