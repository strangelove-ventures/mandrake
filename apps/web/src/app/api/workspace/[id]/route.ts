import { NextResponse } from 'next/server'
import {
    readFullWorkspaceConfig,
    getWorkspacePath,
    initWorkspaceConfig,
    ensureDir
} from '@mandrake/types'
import { prisma } from '@/lib/db'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = await params

    try {
        const dbWorkspace = await prisma.workspace.findUnique({
            where: { id }
        })

        if (!dbWorkspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            )
        }

        // Get the workspace paths
        const paths = getWorkspacePath(dbWorkspace.name)

        // Ensure workspace structure exists
        await Promise.all([
            ensureDir(paths.config),
            ensureDir(paths.contextFiles),
            ensureDir(paths.src)
        ])

        // Check if config files exist, if not initialize them
        try {
            await readFullWorkspaceConfig(dbWorkspace.name)
        } catch (error) {
            // If any config files are missing, initialize defaults
            await initWorkspaceConfig(paths.root)
        }

        // Now we can safely read the config
        const config = await readFullWorkspaceConfig(dbWorkspace.name)

        return NextResponse.json({
            ...dbWorkspace,
            config
        })
    } catch (error) {
        console.error('Failed to get workspace:', error)
        return NextResponse.json(
            { error: 'Failed to get workspace configuration' },
            { status: 500 }
        )
    }
}


export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.workspace.delete({
            where: { id: params.id }
        })
        // TODO: Implement filesystem cleanup
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete workspace:', error)
        return NextResponse.json(
            { error: 'Failed to delete workspace' },
            { status: 500 }
        )
    }
}