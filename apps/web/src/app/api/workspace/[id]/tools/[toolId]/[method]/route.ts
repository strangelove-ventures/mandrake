import { NextResponse } from 'next/server'
import { workspaceServerManager } from '@/lib/services/workspace-server'
import { getWorkspaceTools } from '@mandrake/types'
import { prisma } from '@/lib/db'

async function getWorkspaceAndServer(workspaceId: string, toolId: string) {
    try {
        // First get workspace from database to get its name
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId }
        })

        if (!workspace) {
            console.error('Workspace not found:', { workspaceId })
            return null
        }

        // Get tools config using workspace name
        const tools = await getWorkspaceTools(workspace.name)
        const serverConfig = tools.find(t => t.id === toolId)

        if (!serverConfig) {
            console.error('Server config not found:', { toolId })
            return null
        }

        // Get the MCP server using the generated name, not the friendly ID
        const server = await workspaceServerManager.getServer(serverConfig.name)
        if (!server) {
            console.error('MCP server not found:', {
                toolId,
                mcpId: serverConfig.name
            })
            return null
        }

        return { serverConfig, server }
    } catch (error) {
        console.error('Error getting workspace and server:', error)
        return null
    }
}

export async function GET(
    request: Request,
    { params }: { params: { id: string; toolId: string; method: string } }
) {
    const { id: workspaceId, toolId, method } = await params

    try {
        const result = await getWorkspaceAndServer(workspaceId, toolId)
        if (!result) {
            return NextResponse.json(
                { error: 'Server not found' },
                { status: 404 }
            )
        }

        const { server } = result
        const tools = await server.listTools()
        const tool = tools.find(t => t.name === method)

        if (!tool) {
            console.error('Tool not found:', { method })
            return NextResponse.json(
                { error: 'Tool not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ tool })
    } catch (error) {
        console.error('Failed to get tool details:', error)
        return NextResponse.json(
            { error: 'Failed to get tool details' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string; toolId: string; method: string } }
) {
    const { id: workspaceId, toolId, method } = await params

    try {
        const result = await getWorkspaceAndServer(workspaceId, toolId)
        if (!result) {
            return NextResponse.json(
                { error: 'Server not found' },
                { status: 404 }
            )
        }

        const { server } = result
        const body = await request.json()
        console.log('Invoking tool:', {
            friendlyId: toolId,
            mcpId: result.serverConfig.name,
            method,
            params: body
        })

        const toolResult = await server.invokeTool(method, body)

        return NextResponse.json({
            result: toolResult,
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