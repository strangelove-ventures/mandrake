// apps/web/src/app/api/workspace/[id]/context/route.ts
import { NextResponse } from 'next/server'
import { readContextConfig, writeContextConfig, type ContextConfig } from '@mandrake/types'
import { prisma } from '@/lib/db'

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
        return NextResponse.json(config)
    } catch (error) {
        console.error('Failed to read context config:', error)
        return NextResponse.json(
            { error: 'Failed to read context config' },
            { status: 500 }
        )
    }
}

export async function PUT(
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

        const config: ContextConfig = await request.json()
        await writeContextConfig(workspace.name, config)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to update context config:', error)
        return NextResponse.json(
            { error: 'Failed to update context config' },
            { status: 500 }
        )
    }
}