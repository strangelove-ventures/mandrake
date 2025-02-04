// apps/web/src/app/api/workspace/[id]/dynamic/route.ts
import { NextResponse } from 'next/server'
import {
    readContextConfig,
    writeContextConfig,
    type ContextConfig,
    type DynamicContextMethodConfig
} from '@mandrake/types'
import { prisma } from '@/lib/db'

// Get all dynamic contexts
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = await params

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id }
        })

        if (!workspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            )
        }

        const config = await readContextConfig(workspace.name)
        return NextResponse.json(config.dynamicContexts || [])
    } catch (error) {
        console.error('Failed to read dynamic contexts:', error)
        return NextResponse.json(
            { error: 'Failed to read dynamic contexts' },
            { status: 500 }
        )
    }
}

// Create new dynamic context
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = await params

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id }
        })

        if (!workspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            )
        }

        const newContext: Omit<DynamicContextMethodConfig, 'id'> = await request.json()
        const config = await readContextConfig(workspace.name)

        const newDynamicContext: DynamicContextMethodConfig = {
            ...newContext,
            id: `dc_${Date.now()}`
        }

        config.dynamicContexts = [...(config.dynamicContexts || []), newDynamicContext]
        await writeContextConfig(workspace.name, config)

        return NextResponse.json(newDynamicContext)
    } catch (error) {
        console.error('Failed to add dynamic context:', error)
        return NextResponse.json(
            { error: 'Failed to add dynamic context' },
            { status: 500 }
        )
    }
}

// Update dynamic context
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = await params

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id }
        })

        if (!workspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            )
        }

        const { dynamicContextId, updates } = await request.json()
        const config = await readContextConfig(workspace.name)

        const contextIndex = config.dynamicContexts?.findIndex(dc => dc.id === dynamicContextId)
        if (contextIndex === -1) {
            return NextResponse.json(
                { error: 'Dynamic context not found' },
                { status: 404 }
            )
        }

        config.dynamicContexts[contextIndex] = {
            ...config.dynamicContexts[contextIndex],
            ...updates
        }

        await writeContextConfig(workspace.name, config)
        return NextResponse.json(config.dynamicContexts[contextIndex])
    } catch (error) {
        console.error('Failed to update dynamic context:', error)
        return NextResponse.json(
            { error: 'Failed to update dynamic context' },
            { status: 500 }
        )
    }
}

// Delete dynamic context
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = await params

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id }
        })

        if (!workspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            )
        }

        const { dynamicContextId } = await request.json()
        const config = await readContextConfig(workspace.name)

        config.dynamicContexts = config.dynamicContexts?.filter(dc => dc.id !== dynamicContextId) || []
        await writeContextConfig(workspace.name, config)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete dynamic context:', error)
        return NextResponse.json(
            { error: 'Failed to delete dynamic context' },
            { status: 500 }
        )
    }
}