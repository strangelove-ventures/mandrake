import { NextRequest } from 'next/server';
import { ToolChat } from '@/lib/tool-chat';
import { dbInitialized } from '@/lib/init';

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();
    console.log('Request payload:', { message, sessionId }); // Debug

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // Wait for workspace initialization and log for debugging
    const workspaceId = await dbInitialized;
    console.log('Workspace ID:', workspaceId); // Debug

    // Create chat with workspace ID
    const chat = new ToolChat();
    const stream = await chat.streamChat(message, workspaceId, sessionId);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream route error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error  // Log the raw error object separately
    });

    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}