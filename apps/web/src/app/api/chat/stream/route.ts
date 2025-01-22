// src/app/api/chat/stream/route.ts
import { NextRequest } from 'next/server';
import { MandrakeChat } from '@/lib/mandrake-chat';
import { prisma } from '@/lib/db';
import { dbInitialized } from '@/lib/init';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationId } = await req.json();

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // Wait for DB initialization
    const workspaceId = await dbInitialized;

    // Create or get the conversation
    const conversation = conversationId
      ? await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { messages: true }
        })
      : await prisma.conversation.create({
          data: {
            title: message.slice(0, 50),
            workspaceId,
            messages: {
              create: {
                role: 'user',
                content: message,
              }
            }
          },
          include: { messages: true }
        });

    if (!conversation) {
      return new Response('Conversation not found', { status: 404 });
    }

    // Get the chat stream
    const chat = new MandrakeChat();
    const stream = await chat.streamChat(message, conversation.id);

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