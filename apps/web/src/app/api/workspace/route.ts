// apps/web/src/app/api/workspace/route.ts
import { NextResponse } from 'next/server'
import { syncWorkspaces, createWorkspace } from '@mandrake/types'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        // Sync workspaces first
        const syncResult = await syncWorkspaces(prisma)
        console.log('Workspace sync result:', syncResult)

        // Then get all workspaces from DB
        const workspaces = await prisma.workspace.findMany({
            orderBy: { createdAt: 'desc' }
        })

        if (!workspaces) {
            return NextResponse.json({ workspaces: [] })
        }

        return NextResponse.json({ workspaces })
    } catch (error) {
        // Safe error logging
        console.error('Failed to list workspaces:', error instanceof Error ? error.message : 'Unknown error')

        return NextResponse.json(
            {
                error: 'Failed to list workspaces',
                workspaces: []
            },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const { name, description } = await request.json()

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        // Create DB entry first
        const dbWorkspace = await prisma.workspace.create({
            data: { name, description }
        })

        // Then create filesystem structure
        await createWorkspace(name, dbWorkspace.id, description)

        return NextResponse.json({ workspace: dbWorkspace })
    } catch (error) {
        console.error('Failed to create workspace:', error instanceof Error ? error.message : 'Unknown error')

        return NextResponse.json(
            { error: 'Failed to create workspace' },
            { status: 500 }
        )
    }
}