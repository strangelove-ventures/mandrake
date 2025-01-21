import { NextResponse } from 'next/server';
import { prisma } from '@mandrake/storage';

export async function GET(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const { conversationId } = await params;  
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: true }
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}