import { NextResponse } from 'next/server';
import { prisma } from '@mandrake/storage';

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
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
    console.error('Fetch conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}