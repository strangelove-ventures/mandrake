import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

export async function POST(req: Request) {
  try {
    const { message, conversationId } = await req.json();
    
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });
    } else {
      conversation = await prisma.conversation.create({
        data: {},
        include: { messages: true }
      });
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        conversationId: conversation.id
      }
    });

    // Initialize chat model
    const chatModel = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
      modelName: "gemini-pro",
      maxOutputTokens: 2048,
    });

    // Format messages for LangChain
    const messageHistory = conversation.messages.map(msg => 
      msg.role === 'user' 
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );
    
    const currentMessage = new HumanMessage(message);

    // Get AI response
    const response = await chatModel.call([...messageHistory, currentMessage]);

    // Save AI response
    const aiMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: response.content,
        conversationId: conversation.id
      }
    });

    // Fetch updated conversation with all messages
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    return NextResponse.json({
      conversationId: conversation.id,
      messages: updatedConversation?.messages || []
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}