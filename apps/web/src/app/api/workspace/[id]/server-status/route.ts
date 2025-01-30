// apps/web/src/app/api/workspace/[id]/server-status/route.ts
import { NextResponse } from 'next/server'
import { getServerStatuses } from '@/lib/mcp'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const statuses = await getServerStatuses()
        console.log("API route statuses:", statuses)  // Add this
        return NextResponse.json(statuses)
    } catch (error) {
        console.error('Failed to get server statuses:', error)
        return NextResponse.json(
            { error: 'Failed to get server statuses' },
            { status: 500 }
        )
    }
}