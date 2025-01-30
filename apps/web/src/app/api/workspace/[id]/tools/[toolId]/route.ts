// apps/web/src/app/api/workspace/tools/[id]/route.ts
import { NextResponse } from 'next/server'
import { workspaceServerManager } from '@/lib/services/workspace-server'

export async function GET(
    request: Request,
    { params }: { params: { toolId: string } }
) {
    const { toolId } = await params

    try {
        // Get the server by ID from the workspace server manager 
        const server = await workspaceServerManager.getServer(toolId)
        if (!server) {
            return NextResponse.json(
                { error: 'Server not found' },
                { status: 404 }
            )
        }

        // Get the tools from the server
        const tools = await server.listTools()
        return NextResponse.json({ tools })
    } catch (error) {
        console.error('Failed to list tools:', error)
        return NextResponse.json(
            { error: 'Failed to list tools' },
            { status: 500 }
        )
    }
}