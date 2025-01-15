import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { GoogleGenerativeAI } from '@google/generative-ai';

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
            streaming: true,
            // Add generation config
            modelKwargs: {
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_ONLY_HIGH",
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_ONLY_HIGH",
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_ONLY_HIGH",
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_ONLY_HIGH",
                },
              ],
            },
          });

          // Format message history
          const messageHistory = conversation.messages.map(msg => 
            msg.role === 'user' 
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content)
          );

          let fullResponse = '';

          try {
            const stream = await chatModel.stream([
              ...messageHistory,
              new HumanMessage(message)
            ]);

            for await (const chunk of stream) {
              if (chunk.content) {
                // Send each chunk immediately
                controller.enqueue(encoder.encode(JSON.stringify({
                  type: 'chunk',
                  content: chunk.content
                }) + '\n'));
                
                // Build full response for database
                fullResponse += chunk.content;
              }
            }

            // After streaming is complete, save to database
            const aiMessage = await prisma.message.create({
              data: {
                role: 'assistant',
                content: fullResponse || "I apologize, but I encountered an error generating the response.",
                conversationId: conversation.id
              }
            });

            // Send final message with the saved AI message ID
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'done',
              aiMessage
            }) + '\n'));

          } catch (error: any) {
            console.error('Streaming error:', error);
            
            // If we have a partial response, save it
            if (fullResponse) {
              const aiMessage = await prisma.message.create({
                data: {
                  role: 'assistant',
                  content: fullResponse,
                  conversationId: conversation.id
                }
              });

              controller.enqueue(encoder.encode(JSON.stringify({
                type: 'done',
                aiMessage
              }) + '\n'));
            } else {
              // If no response at all, send an error message
              const errorMessage = "I apologize, but I wasn't able to complete that response. Please try rephrasing your question.";
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