import { NextResponse } from 'next/server';
import { prisma } from '@mandrake/storage';
import { Tool } from '@mandrake/types';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";


function buildSystemPrompt(tools: Tool[]) {
  const toolSchemas = tools.map(tool => ({
    name: tool.name,
    description: tool.description || '',
    parameters: tool.inputSchema
  }));

  return `In this environment you have access to a set of tools you can use to answer the user's question.

You can invoke functions by writing a "

String and scalar parameters should be specified as is, while lists and objects should use JSON format. Note that spaces for string values are not stripped. The output is not expected to be valid XML and is parsed with regular expressions.

Here are the functions available in JSONSchema format:
${JSON.stringify(toolSchemas, null, 2)}

Remember:
- Each tool serves a specific purpose and should be used appropriately
- Tools can be chained together to solve more complex tasks
- Handle errors gracefully and provide clear feedback about tool operations
- When a tool returns an error, explain the issue and suggest alternatives`;
}

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
    const chatModel = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY!,
      modelName: "gemini-pro",
      maxOutputTokens: 2048,
    });

    // Format messages for LangChain
    const messageHistory = [
      // TODO: get the tools from the DockerMCPService and/or workspace configuration. 
      new SystemMessage(buildSystemPrompt([])),
      ...conversation.messages.map(msg => 
      msg.role === 'user' 
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    )];
    
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