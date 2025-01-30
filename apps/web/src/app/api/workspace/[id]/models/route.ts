// apps/web/src/app/api/workspace/[id]/models/route.ts
import { NextResponse } from 'next/server'
import {
    readWorkspaceConfig,
    readModelsConfig,
    writeModelsConfig,
    type ModelsConfig
} from '@mandrake/types'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const workspace = await readWorkspaceConfig(params.id)
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
    try {
        const workspace = await readWorkspaceConfig(params.id)
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