import { NextRequest } from 'next/server';
import { prisma } from '@mandrake/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

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
      return new Response(JSON.stringify({ error: 'Session not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get session error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get session' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}