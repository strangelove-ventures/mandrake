import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  try {
    const { message, conversationId } = await req.json();
    
    // Find or create conversation
    let conversation = conversationId 
      ? await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          }
        })
      : await prisma.conversation.create({
          data: {},
          include: { messages: true }
        });

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

    // Initialize streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial state with user message and conversation ID
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'init',
            conversationId: conversation.id,
            userMessage
          }) + '\n'));

          // Initialize chat model with streaming
          const chatModel = new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY!,
            modelName: "gemini-pro",
            maxOutputTokens: 2048,
            // Add safety settings to be more permissive
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE",
              },
            ],
          });

          // Format message history
          const messageHistory = conversation.messages.map(msg => 
            msg.role === 'user' 
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content)
          );

          try {
            // Get non-streaming response first to validate
            const response = await chatModel.call([
              ...messageHistory,
              new HumanMessage(message)
            ]);

            // If we get here, the response is safe, so let's stream it
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'chunk',
              content: response.content
            }) + '\n'));

            // Save the AI response
            const aiMessage = await prisma.message.create({
              data: {
                role: 'assistant',
                content: response.content,
                conversationId: conversation.id
              }
            });

            // Send final message with the saved AI message
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'done',
              aiMessage
            }) + '\n'));

          } catch (error: any) {
            // Handle safety filter blocks
            if (error.message?.includes('SAFETY')) {
              const errorMessage = "I apologize, but I cannot provide a response to that request. Please try rephrasing your question.";
              
              const aiMessage = await prisma.message.create({
                data: {
                  role: 'assistant',
                  content: errorMessage,
                  conversationId: conversation.id
                }
              });

              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'chunk',
                content: errorMessage
              }) + '\n'));

              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'done',
                aiMessage
              }) + '\n'));
            } else {
              throw error;
            }
          }

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}