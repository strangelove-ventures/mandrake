
        const fs = require('fs');
        fs.writeFileSync('/Users/johnzampolin/go/src/github.com/strangelove-ventures/mandrake/packages/mcp/test-env-output.txt', JSON.stringify(process.env));
        
        // Basic MCP server that just echoes back
        const { FastMCP } = require('fastmcp');
        const { z } = require('zod');
        
        const server = new FastMCP({
          name: 'env-test-server',
          version: '1.0.0'
        });
        
        server.addTool({
          name: 'echo',
          description: 'Echo back the input',
          parameters: z.object({
            message: z.string()
          }),
          execute: async (args) => {
            return args.message;
          }
        });
        
        server.start({ transportType: 'stdio' });
      