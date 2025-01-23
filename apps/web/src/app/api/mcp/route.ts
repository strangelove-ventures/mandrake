import { NextResponse } from 'next/server';
import { mcpService, mcpInitialized } from '@/lib/mcp';

export async function GET() {
    try {
        // Don't wait for initialization to return a response
        const serverMap = mcpService.getServers();
        const serverPromises = Array.from(serverMap.entries()).map(async ([id, server]) => {
            try {
                const info = await Promise.race([
                    server.getInfo(),
                    // Timeout after 2 seconds
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 2000)
                    )
                ]);
                return {
                    id,
                    name: server.getName(),
                    type: id,
                    status: info.State?.Running ? 'connected' : 'disconnected'
                };
            } catch (err) {
                // If there's an error or timeout, return server as disconnected
                return {
                    id,
                    name: server.getName(),
                    type: id,
                    status: 'disconnected'
                };
            }
        });

        const servers = await Promise.all(serverPromises);
        return NextResponse.json({ servers });
    } catch (error) {
        console.error('Failed to fetch MCP servers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch MCP servers' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        await mcpInitialized;
        // TODO: Implement server addition logic
        const result = { success: true };
        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to add MCP server:', error);
        return NextResponse.json(
            { error: 'Failed to add MCP server' },
            { status: 500 }
        );
    }
}