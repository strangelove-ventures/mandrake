import { NextResponse } from 'next/server'
import { readContextFile, getWorkspacePath } from '@mandrake/types'
import { getWorkspaceNameFromId } from '../stream/route'
import path from 'path'
import fs from 'fs/promises'

export async function POST(
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

        const { content } = await request.json()
        if (!content) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            )
        }

        const paths = getWorkspacePath(workspaceName)
        const filePath = path.join(paths.contextFiles, filename)

        // Write the file content
        await fs.writeFile(filePath, content, 'utf8')

        // Return success
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to create file:', error)
        return NextResponse.json(
            { error: 'Failed to create file' },
            { status: 500 }
        )
    }
}

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