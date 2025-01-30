// apps/web/src/app/api/workspace/[id]/models/route.ts
import { NextResponse } from 'next/server'
import { readModelsConfig, writeModelsConfig, type ModelsConfig } from '@mandrake/types'
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

        const config = await readModelsConfig(workspace.name)
        return NextResponse.json(config)
    } catch (error) {
        console.error('Failed to read models config:', error)
        return NextResponse.json(
            { error: 'Failed to read models config' },
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

        const config: ModelsConfig = await request.json()
        await writeModelsConfig(workspace.name, config)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to update models config:', error)
        return NextResponse.json(
            { error: 'Failed to update models config' },
            { status: 500 }
        )
    }
}