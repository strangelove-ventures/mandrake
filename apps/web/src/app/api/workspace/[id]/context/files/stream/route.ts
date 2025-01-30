// apps/web/src/app/api/workspace/[id]/context/files/stream/route.ts
import { NextResponse } from 'next/server'
import { FileWatcherService, FileChangeEvent } from '@/lib/services/file-watcher'
import { headers } from 'next/headers'
import fs from 'fs/promises'
import { getWorkspacesDir, readWorkspaceConfig } from '@mandrake/types'

// Helper to get workspace name from ID
export async function getWorkspaceNameFromId(id: string): Promise<string | null> {
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
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    let { id } = await params
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const encoder = new TextEncoder()

    try {
        const workspaceName = await getWorkspaceNameFromId(id)
        if (!workspaceName) {
            return NextResponse.json(
                { error: `No workspace found with id ${id}` },
                { status: 404 }
            )
        }

        // Create watcher service with event handler
        const watcher = new FileWatcherService(async (event: FileChangeEvent) => {
            const data = `data: ${JSON.stringify(event)}\n\n`
            await writer.write(encoder.encode(data))
        })

        // Start watching and get cleanup function
        const cleanup = watcher.watchWorkspace(workspaceName)

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
            cleanup()
            watcher.cleanup()
        })

        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })
    } catch (error) {
        console.error('Failed to setup file streaming:', error)
        return NextResponse.json(
            { error: 'Failed to setup file streaming' },
            { status: 500 }
        )
    }
}
