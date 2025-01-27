import { NextRequest } from 'next/server';
import { dbInitialized } from '@/lib/init';
import { prisma, getOrCreateSession } from '@mandrake/storage';

export async function POST(req: NextRequest) {
  try {
    const workspaceId = await dbInitialized;
    console.log('Creating session with workspaceId:', workspaceId);

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: 'No workspace available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use the getOrCreateSession function instead of direct creation
    const session = await getOrCreateSession(workspaceId);

    return new Response(JSON.stringify(session), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create session error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return new Response(JSON.stringify({
      error: 'Failed to create session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}