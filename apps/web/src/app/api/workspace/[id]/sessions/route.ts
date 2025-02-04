import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = await params

    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id }
        })

        if (!workspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            )
        }

        const sessions = await prisma.session.findMany({
            where: {
                workspaceId: id
            },
            include: {
                rounds: {
                    include: {
                        request: true,
                        response: {
                            include: {
                                turns: {
                                    orderBy: {
                                        index: 'asc'
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        index: 'asc'
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        })

        return NextResponse.json(sessions)
    } catch (error) {
        console.error('Failed to fetch workspace sessions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch workspace sessions' },
            { status: 500 }
        )
    }
}