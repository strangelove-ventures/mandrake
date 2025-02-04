import { NextResponse } from 'next/server'
import { workspaceServerManager } from '@/lib/services/workspace-server'

export async function POST(
    request: Request,
    { params }: { params: { id: string; toolId: string; method: string } }
) {
    const { toolId, method } = await params

    try {
        const server = await workspaceServerManager.getServer(toolId)
        if (!server) {
            return NextResponse.json(
                { error: 'Server not found' },
                { status: 404 }
            )
        }

        const methodParams = await request.json()
        const result = await server.invokeTool(method, methodParams)

        return NextResponse.json({
            result,
            // TODO: Add token calculation if needed
            tokenCount: 0
        })
    } catch (error) {
        console.error('Failed to execute method:', error)
        return NextResponse.json(
            { error: 'Failed to execute method' },
            { status: 500 }
        )
    }
}