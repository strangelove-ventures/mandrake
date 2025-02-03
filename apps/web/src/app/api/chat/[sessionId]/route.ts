import { NextResponse } from 'next/server';
import { prisma } from '@mandrake/storage/dist/browser';

export async function GET(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
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
      }
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}