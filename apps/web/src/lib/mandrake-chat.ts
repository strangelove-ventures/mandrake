import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, AIMessageChunk } from "@langchain/core/messages";
import { mcpService, mcpInitialized } from './mcp';
import { buildSystemPrompt } from './chat';
import { prisma } from './db';

interface ChatInput {
  message: string;
  conversationId?: string;
}

// Types for our message handling
interface TextContent {
  type: 'text';
  text: string;
}

interface ToolCallContent {
  type: 'tool_use';
  name: string;
  input: any;
}

type MessageContent = TextContent | ToolCallContent;
type ParsedResponse = { content: MessageContent[] };

export class MandrakeChat {
  private chatModel: ChatOpenAI;

  constructor() {
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
  }

  private async buildMessages(input: ChatInput) {
    await mcpInitialized;
    const tools = await this.getAvailableTools();
    const conversation = await this.getOrCreateConversation(input);

    return [
      new SystemMessage(buildSystemPrompt(tools)),
      ...conversation.messages.map(msg =>
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      ),
      new HumanMessage(input.message)
    ];
  }

  private async handleToolCall(toolCall: ToolCallContent): Promise<any> {
    const mapping = mcpService.getToolServer(toolCall.name);
    if (!mapping) throw new Error(`No server found for tool: ${toolCall.name}`);
    return await mapping.server.invokeTool(toolCall.name, toolCall.input);
  }

  async streamChat(message: string, conversationId?: string) {
    const chat = this;  // Capture this for use in ReadableStream

    let fullResponse = '';
    return new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const writeChunk = async (chunk: { type: string; content: string }) => {
          // console.log("[MANDRAKE] Writing chunk:", chunk);
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
        };

        try {
          let jsonBuffer = '';
          console.log("[MANDRAKE] Building messages...");
          const messages = await chat.buildMessages({ message, conversationId });
          console.log("[MANDRAKE] Built messages:", messages.length);

          const processStream = async (stream: AsyncGenerator<AIMessageChunk>) => {
            console.log("[MANDRAKE] Starting stream processing");
            for await (const chunk of stream) {
              // console.log("[MANDRAKE] Raw chunk:", chunk);

              if (!chunk.content) {
                console.log("[MANDRAKE] Empty chunk, skipping");
                continue;
              }

              // Detect if this looks like a JSON response
              if (jsonBuffer || chunk.content.toString().trim().startsWith('{')) {
                // console.log("[MANDRAKE] Adding to JSON buffer:", chunk.content);
                jsonBuffer += chunk.content;
                try {
                  const parsed = JSON.parse(jsonBuffer) as ParsedResponse;
                  console.log("[MANDRAKE] Parsed complete JSON:", parsed);
                  jsonBuffer = ''; // Reset buffer after successful parse

                  // Process each content item
                  for (const item of parsed.content) {
                    if (item.type === 'text') {
                      console.log("[MANDRAKE] Writing text content:", item.text);
                      await writeChunk({ type: 'chunk', content: item.text });
                      fullResponse += item.text;
                    } else if (item.type === 'tool_use') {
                      console.log("[MANDRAKE] Handling tool call:", item.name);
                      await writeChunk({ type: 'tool_call', content: JSON.stringify({ content: [item] }) });

                      const result = await chat.handleToolCall(item);
                      console.log("[MANDRAKE] Tool result:", result);

                      // Add interaction to message history
                      messages.push(
                        new AIMessage(JSON.stringify({ content: [item] })),
                        new HumanMessage(JSON.stringify(result))
                      );

                      return chat.chatModel.stream(messages);
                    }
                  }
                } catch (e) {
                  // console.log("[MANDRAKE] Incomplete JSON, continuing...");
                }
              } else {
                // console.log("[MANDRAKE] Direct streaming:", chunk.content);
                await writeChunk({ type: 'chunk', content: chunk.content.toString() });
                fullResponse += chunk.content;
              }
            }
            console.log("[MANDRAKE] Stream complete");
            return null;
          };

          let currentStream = await chat.chatModel.stream(messages);
          while (currentStream) {
            const nextStream = await processStream(currentStream);
            if (nextStream) {
              currentStream = nextStream;
            } else {
              break;
            }
          }

          if (conversationId && fullResponse) {
            console.log("[MANDRAKE] Saving conversation");
            await prisma.message.create({
              data: {
                role: 'assistant',
                content: fullResponse,
                conversationId
              }
            });
          }

        } catch (error) {
          console.error("[MANDRAKE] Stream error:", error);
          controller.error(error);
        } finally {
          console.log("[MANDRAKE] Final response:", fullResponse);
          console.log("[MANDRAKE] Closing stream");
          controller.close();
        }
      }
    });
  }

  // Helper methods...
  private async getAvailableTools() {
    const servers = Array.from(mcpService.getServers().values());
    return Promise.all(
      servers.map(async server => {
        try {
          return await server.listTools();
        } catch (e) {
          console.error(`Failed to list tools for server:`, e);
          return [];
        }
      })
    ).then(serverTools => serverTools.flat());
  }

  private async getOrCreateConversation({ message, conversationId }: ChatInput) {
    const conversation = conversationId
      ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
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

    if (!conversation) throw new Error('Conversation not found or could not be created');
    return conversation;
  }
}