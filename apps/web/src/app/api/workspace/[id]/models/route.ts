// apps/web/src/app/api/workspace/[id]/models/route.ts
import { NextResponse } from 'next/server'
import {
    readWorkspaceConfig,
    readModelsConfig,
    writeModelsConfig,
    type ModelsConfig,
    getWorkspacesDir
} from '@mandrake/types'
import fs from 'fs/promises'
import path from 'path'

// Helper to get workspace name from ID
async function getWorkspaceNameFromId(id: string): Promise<string | null> {
    const workspacesDir = getWorkspacesDir()
    const dirs = await fs.readdir(workspacesDir, { withFileTypes: true })

    for (const dir of dirs.filter(d => d.isDirectory())) {
        try {
            const config = await readWorkspaceConfig(dir.name)
            if (config.id === id) {
                return dir.name
            }
        } catch (error) {
            console.warn(`Failed to read workspace ${dir.name}:`, error)
        }
    }
    return null
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    let { id } = await params
    try {
        const workspaceName = await getWorkspaceNameFromId(id)
        if (!workspaceName) {
            return NextResponse.json(
                { error: `No workspace found with id ${id}` },
                { status: 404 }
            )
        }

        const config: ModelsConfig = await request.json()
        await writeModelsConfig(workspaceName, config)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to update models config:', {
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
            workspace: id
        })

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update models config' },
            { status: 500 }
        )
    }
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    let { id } = await params
    try {
        const workspaceName = await getWorkspaceNameFromId(id)
        if (!workspaceName) {
            return NextResponse.json(
                { error: `No workspace found with id ${id}` },
                { status: 404 }
            )
        }

        const config = await readModelsConfig(workspaceName)
        return NextResponse.json(config)
    } catch (error) {
        console.error('Failed to read models config:', error)
        return NextResponse.json(
            { error: 'Failed to read models config' },
            { status: 500 }
        )
    }
}