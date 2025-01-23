import { NextResponse } from 'next/server';
import { prisma } from '@mandrake/storage';
import { dbInitialized } from '@/lib/init';

export async function GET() {
  try {
    // Wait for DB initialization and get workspace ID
    const workspaceId = await dbInitialized;

    const conversations = await prisma.conversation.findMany({
      where: {
        workspaceId: workspaceId  // Add this line
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Fetch conversations error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}