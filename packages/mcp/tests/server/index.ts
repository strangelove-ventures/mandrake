import { FastMCP } from 'fastmcp'
import { z } from 'zod'

const server = new FastMCP({
    name: 'test-server',
    version: '1.0.0'
})

// Simple addition tool
server.addTool({
    name: 'add',
    description: 'Add two numbers',
    parameters: z.object({
        a: z.number(),
        b: z.number()
    }),
    execute: async (args) => {
        return String(args.a + args.b)
    }
})

// Echo tool for testing strings
server.addTool({
    name: 'echo',
    description: 'Echo back the input',
    parameters: z.object({
        message: z.string()
    }),
    execute: async (args) => {
        return args.message
    }
})

// Tool that errors for testing error cases
server.addTool({
    name: 'error',
    description: 'Always throws an error',
    parameters: z.object({
        message: z.string().optional()
    }),
    execute: async (args) => {
        throw new Error(args.message || 'Test error')
    }
})

// Start the server with stdio transport
server.start({
    transportType: 'stdio'
})
