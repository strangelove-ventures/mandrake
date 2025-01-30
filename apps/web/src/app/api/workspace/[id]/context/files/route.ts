// apps/web/src/app/api/workspace/[id]/context/files/route.ts
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { getContextFiles, getWorkspacePath } from '@mandrake/types'
import { getWorkspaceNameFromId } from './stream/route'

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

        // Just pass the workspace name directly
        const files = await getContextFiles(workspaceName)
        return NextResponse.json(files)
    } catch (error) {
        console.error('Failed to get context files:', error)
        return NextResponse.json(
            { error: 'Failed to get context files' },
            { status: 500 }
        )
    }
}

export async function POST(
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

        const formData = await request.formData()
        const files = formData.getAll('files')
        const paths = getWorkspacePath(workspaceName)

        for (const file of files) {
            if (!(file instanceof File)) continue
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            await fs.writeFile(
                path.join(paths.contextFiles, file.name),
                buffer
            )
        }

        // Pass the workspace name directly here too
        const updatedFiles = await getContextFiles(workspaceName)
        return NextResponse.json(updatedFiles)
    } catch (error) {
        console.error('Failed to upload files:', error)
        return NextResponse.json(
            { error: 'Failed to upload files' },
            { status: 500 }
        )
    }
}
