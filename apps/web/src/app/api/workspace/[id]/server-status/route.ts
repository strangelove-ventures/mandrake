import { NextResponse } from 'next/server';
import { workspaceServerManager } from '@/lib/services/workspace-server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const statuses = await workspaceServerManager.getServerStatuses();
    return NextResponse.json(statuses);
}