import { NextRequest } from 'next/server';
import { MandrakeChat } from '@/lib/mandrake-chat';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationId } = await req.json();

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // First create or get the conversation and store initial message
    const conversation = conversationId
      ? await prisma.conversation.findUnique({
        where: { id: conversationId }
      })
      : await prisma.conversation.create({
        data: {
          title: message.slice(0, 50),
          workspaceId: '06d07df4-299d-43f2-b4c3-9b66ae8ccd63', // Default workspace
          messages: {
            create: {
              role: 'user',
              content: message,
            }
          }
        }
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
    console.error('Stream route error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}