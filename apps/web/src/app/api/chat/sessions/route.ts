import { NextResponse } from 'next/server';
import { prisma } from '@mandrake/storage';
import { dbInitialized } from '@/lib/init';

export async function GET() {
  try {
    // Wait for DB initialization and get workspace ID
    const workspaceId = await dbInitialized;

    const sessions = await prisma.session.findMany({
      where: {
        workspaceId
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
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Fetch sessions error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}