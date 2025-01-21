import { NextResponse } from 'next/server';
import { mcpService } from '@/lib/mcp';
import { prisma } from '@mandrake/storage';
import { formatToolsOpenAI } from '@mandrake/mcp';
import { Tool } from '@mandrake/types';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { buildMessageHistory } from '@/lib/chat';

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
        data: {
          workspace: { connect: { id: 'your-workspace-id' } },
          messages: {}
        },
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
        // Initialize chat model with streaming
          const chatModel = new ChatOpenAI({
            openAIApiKey: process.env.DEEPSEEK_API_KEY,
            modelName: "deepseek-chat",
            maxTokens: 2048,
            streaming: true,
            configuration: {
              baseURL: "https://api.deepseek.com/v1",
            }
          });

    const messageHistory = await buildMessageHistory(conversation.id, message);
    const currentMessage = new HumanMessage(message);

    // Get AI response
    const response = await chatModel.call([...messageHistory, currentMessage]);

    // Save AI response
    const aiMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: JSON.stringify(response.content),
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