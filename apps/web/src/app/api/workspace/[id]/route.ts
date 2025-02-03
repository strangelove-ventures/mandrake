import { NextResponse } from 'next/server';
import { logger } from '@mandrake/types';
import { prisma } from '@mandrake/storage/dist/browser';
import { readFullWorkspaceConfig } from '@mandrake/types';

const routeLogger = logger.child({ service: 'workspace' });

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id }
        });

        if (!workspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            );
        }

        // Read config from filesystem
        const config = await readFullWorkspaceConfig(workspace.name);
        routeLogger.debug('Read workspace config', {
            workspace: workspace.id,
            config
        });

        const response = {
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            config,
            created: workspace.createdAt.toISOString()
        };

        return NextResponse.json(response);
    } catch (error) {
        routeLogger.error('Failed to load workspace', {
            workspace: id,
            error
        });
        return NextResponse.json(
            { error: 'Failed to load workspace' },
            { status: 500 }
        );
    }
}