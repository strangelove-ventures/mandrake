import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableSequence } from "@langchain/core/runnables";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { mcpService, mcpInitialized } from './mcp';
import { buildSystemPrompt } from './chat';
import { prisma } from './db';

interface ChatInput {
  message: string;
  conversationId?: string;
}

interface StreamChunk {
  type: 'chunk' | 'tool_call';
  content: string;
}

export class MandrakeChat {
  private chatModel: ChatOpenAI;
  private chain: RunnableSequence;
  private currentMessages: any[] = [];

  constructor() {
    console.log("Initializing MandrakeChat...");
    this.chatModel = new ChatOpenAI({
      streaming: true,
      modelName: "deepseek-chat",
      maxTokens: 4096,
      temperature: 0.7,
      configuration: {
        baseURL: "https://api.deepseek.com/v1",
        apiKey: process.env.DEEPSEEK_API_KEY,
      }
    });
    console.log("ChatModel initialized");

    this.chain = RunnableSequence.from([
      async (input: ChatInput) => {
        console.log("Chain step 1: Building messages for input:", input);
        const messages = await this.buildMessages(input);
        console.log("Messages built:", messages.length, "messages");
        return messages;
      },
      this.chatModel
    ]);
    console.log("Chain initialized");
  }

  private async buildMessages({ message, conversationId }: ChatInput) {
    // Only log initialization status
    await mcpInitialized;

    // Get available tools silently
    const servers = Array.from(mcpService.getServers().values());
    const tools = await Promise.all(
      servers.map(async server => {
        try {
          return await server.listTools();
        } catch (e) {
          console.error(`Failed to list tools for server ${server.getId}:`, e);
          return [];
        }
      })
    ).then(serverTools => serverTools.flat());

    // Get conversation history silently
    const conversation = conversationId
      ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } }
        }
      })
      : message
        ? await prisma.conversation.create({
          data: {
            title: message.slice(0, 50),
            workspaceId: '06d07df4-299d-43f2-b4c3-9b66ae8ccd63'
          },
          include: { messages: true }
        })
        : null;

    if (!conversation) {
      throw new Error('Conversation not found or could not be created');
    }

    // Build and return messages silently
    return [
      new SystemMessage(buildSystemPrompt(tools)),
      ...conversation.messages.map(msg =>
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      ),
      new HumanMessage(message)
    ];
  }

  private async handleToolCall(toolCall: any) {
    console.log("=== Tool Call Debug ===");
    console.log("Tool called:", toolCall.name);
    console.log("Tool input:", toolCall.input);

    const mapping = mcpService.getToolServer(toolCall.name);
    if (!mapping) {
      console.error("No server found for tool:", toolCall.name);
      throw new Error(`No server found for tool: ${toolCall.name}`);
    }

    try {
      console.log("Executing tool with server:", mapping.server.getId());
      const result = await mapping.server.invokeTool(toolCall.name, toolCall.input);
      console.log("Tool execution result:", result);
      return result;
    } catch (error) {
      console.error("Tool execution failed:", error);
      // Instead of throwing, return an error result that the model can handle
      return {
        error: true,
        message: (error as Error).message || 'Tool execution failed'
      };
    }
  }
  async streamChat(message: string, conversationId?: string) {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        let fullResponse = '';
        let accumulatedJson = '';

        this.currentMessages = await this.buildMessages({ message, conversationId });
        const iterator = await this.chatModel.stream(this.currentMessages);

        for await (const chunk of iterator) {
          if (chunk.content) {
            accumulatedJson += chunk.content;

            let isComplete = false;
            try {
              // Look for complete JSON objects
              const parsed = JSON.parse(accumulatedJson);
              if (parsed.content) {
                isComplete = true;

                // Handle the complete JSON object
                const toolCall = parsed.content.find((item: any) => item.type === 'tool_use');
                if (toolCall) {
                  await writer.write(encoder.encode(JSON.stringify({
                    type: 'tool_call',
                    content: JSON.stringify({ content: [toolCall] })
                  }) + '\n'));

                  const result = await this.handleToolCall(toolCall);
                  if (result.error) {
                    await writer.write(encoder.encode(JSON.stringify({
                      type: 'chunk',
                      content: `Error executing tool ${toolCall.name}: ${result.message}`
                    }) + '\n'));
                  } else {
                    // Add tool interaction to history
                    this.currentMessages.push(
                      new AIMessage(JSON.stringify({ content: [toolCall] })),
                      new HumanMessage(JSON.stringify(result))
                    );

                    // Continue with tool result
                    const continueStream = await this.chatModel.stream(this.currentMessages);
                    for await (const newChunk of continueStream) {
                      if (newChunk.content) {
                        await writer.write(encoder.encode(JSON.stringify({
                          type: 'chunk',
                          content: newChunk.content
                        }) + '\n'));
                        fullResponse += newChunk.content;
                      }
                    }
                  }
                } else {
                  // Regular content
                  const textContent = parsed.content.find((item: any) => item.type === 'text')?.text;
                  if (textContent) {
                    await writer.write(encoder.encode(JSON.stringify({
                      type: 'chunk',
                      content: textContent
                    }) + '\n'));
                    fullResponse += textContent;
                  }
                }
                // Reset after handling complete JSON
                accumulatedJson = '';
              }
            } catch (e) {
              // Only write to stream if we didn't find a complete JSON object
              if (!isComplete) {
                await writer.write(encoder.encode(JSON.stringify({
                  type: 'chunk',
                  content: chunk.content
                }) + '\n'));
                fullResponse += chunk.content;
              }
            }
          }
        }

        if (conversationId && fullResponse) {
          await prisma.message.create({
            data: {
              role: 'assistant',
              content: fullResponse,
              conversationId
            }
          });
        }

        await writer.close();
      } catch (error) {
        console.error("Streaming error:", error);
        await writer.abort(error);
      }
    })().catch(error => {
      console.error("Background streaming error:", error);
    });

    return stream.readable;
  }
}
