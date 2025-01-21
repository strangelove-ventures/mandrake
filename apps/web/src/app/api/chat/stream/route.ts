import { NextResponse } from 'next/server';
import { prisma, ensureDefaultWorkspace } from '@mandrake/storage';
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  try {
    // Debug: Log the request and body parsing
    const body = await req.json();
    console.log('Request body:', body);
    const { message, conversationId } = body;
    
    // Ensure we have a default workspace
    const workspace = await ensureDefaultWorkspace();
    console.log('Using workspace:', workspace.id);
    
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
          data: {
            title: message.slice(0, 50),  // Use start of message as title
            workspaceId: workspace.id
          },
          include: { messages: true }
        });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    console.log('Using conversation:', conversation.id);

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        conversationId: conversation.id
      }
    });

    console.log('Created user message:', userMessage.id);

    // Initialize streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let streamError = null;
        
        try {
          // Send initial state with user message and conversation ID
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'init',
            conversationId: conversation.id,
            userMessage
          }) + '\n'));

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

            console.log('Created AI message:', aiMessage.id);

            // Send final message with the saved AI message ID
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'done',
              aiMessage
            }) + '\n'));

          } catch (error: any) {
            console.error('AI Stream error:', error);
            streamError = error;
            
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
          console.error('Stream creation error:', error);
          streamError = error;
          controller.error(error);
        }

        if (streamError) {
          throw streamError; // Re-throw for outer catch block
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
    // Safe error conversion for JSON response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    console.error('Chat API error:', errorDetails);
    
    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
}