import { NextResponse } from 'next/server'
import { readContextFile } from '@mandrake/types'
import { getWorkspaceNameFromId } from '../stream/route'

export async function GET(
    request: Request,
    { params }: { params: { id: string, filename: string } }
) {
    let { id, filename } = await params
    try {
        const workspaceName = await getWorkspaceNameFromId(id)
        if (!workspaceName) {
            return NextResponse.json(
                { error: `No workspace found with id ${id}` },
                { status: 404 }
            )
        }

        const content = await readContextFile(workspaceName, filename)

        // Send as plain text to prevent HTML rendering
        return new NextResponse(content, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            }
        })
    } catch (error) {
        console.error('Failed to read file:', error)
        return NextResponse.json(
            { error: 'Failed to read file' },
            { status: 500 }
        )
    }
}