import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, AIMessageChunk } from "@langchain/core/messages";
import { mcpService, mcpInitialized } from './mcp';
import { buildSystemPrompt } from './chat';
import { StreamProcessor } from './chat-state';
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
    const self = this;
    const streamProcessor = new StreamProcessor();

    return new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Subscribe to state changes to handle UI updates
        streamProcessor.subscribe((state) => {
          if (state.type === 'streaming' && state.chunk) {
            const chunk = { type: 'chunk', content: state.chunk };
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
          }
        });

        try {
          const messages = await self.buildMessages({ message, conversationId });
          let currentStream = await self.chatModel.stream(messages);

          while (currentStream) {
            const toolCall = await streamProcessor.processStream(currentStream);

            if (toolCall) {
              // Handle tool call
              const toolChunk = {
                type: 'tool_call',
                content: JSON.stringify({ content: [toolCall] })
              };
              controller.enqueue(encoder.encode(JSON.stringify(toolChunk) + '\n'));

              const result = await self.handleToolCall(toolCall);

              // Add tool interaction to message history
              messages.push(
                new AIMessage(JSON.stringify({ content: [toolCall] })),
                new HumanMessage(JSON.stringify(result))
              );

              // Start new stream with updated messages
              currentStream = await self.chatModel.stream(messages);
            } else {
              // Stream completed normally
              break;
            }
          }

          // Save conversation if we have a valid response
          const fullResponse = streamProcessor.getFullResponse();
          if (conversationId && fullResponse) {
            await prisma.message.create({
              data: {
                role: 'assistant',
                content: fullResponse,
                conversationId
              }
            });
          }

        } catch (error) {
          console.error("[MandrakeChat] Stream error:", error);
          controller.error(error);
        } finally {
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