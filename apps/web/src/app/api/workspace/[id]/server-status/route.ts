// apps/web/src/app/api/workspace/[id]/server-status/route.ts
import { NextResponse } from 'next/server';
import { workspaceServerManager } from '@/lib/services/workspace-server';
import { logger } from '@mandrake/types';
import { prisma } from '@/lib/db';
import { WorkspaceFullConfig } from '@mandrake/types';

const routeLogger = logger.child({ service: 'server-status' });

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    let { id } = await params;
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

        // Parse the config JSON
        const config = workspace.config ? (workspace.config as unknown as WorkspaceFullConfig) : undefined;

        if (config) {
            // Validate and reconcile before returning status
            await workspaceServerManager.validateAndReconcile(id, config);
        }

        const statuses = workspaceServerManager.getServerStatuses();
        routeLogger.debug('Retrieved server statuses', {
            workspace: id,
            statuses
        });

        return NextResponse.json(statuses);
    } catch (error) {
        routeLogger.error('Failed to get server statuses', {
            workspace: id,
            error
        });
        return NextResponse.json(
            { error: 'Failed to get server statuses' },
            { status: 500 }
        );
    }
}