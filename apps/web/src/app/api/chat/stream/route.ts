// src/app/api/chat/stream/route.ts
import { NextRequest } from 'next/server';
import { MandrakeChat } from '@/lib/mandrake-chat';

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // Get the chat stream - MandrakeChat handles session creation/retrieval
    const chat = new MandrakeChat();
    const stream = await chat.streamChat(message, sessionId);

    // Return the stream with proper headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream route error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}