// apps/web/src/app/api/workspace/[id]/system-prompt/route.ts
import { NextResponse } from 'next/server'
import { readSystemPrompt, writeSystemPrompt } from '@mandrake/types'
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

        const prompt = await readSystemPrompt(workspace.name)
        return NextResponse.json({ prompt })
    } catch (error) {
        console.error('Failed to read system prompt:', error)
        return NextResponse.json(
            { error: 'Failed to read system prompt' },
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

        const { prompt } = await request.json()
        if (typeof prompt !== 'string') {
            return NextResponse.json(
                { error: 'Invalid prompt format' },
                { status: 400 }
            )
        }

        await writeSystemPrompt(workspace.name, prompt)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to update system prompt:', error)
        return NextResponse.json(
            { error: 'Failed to update system prompt' },
            { status: 500 }
        )
    }
}