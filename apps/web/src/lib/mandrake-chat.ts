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
    console.log("buildMessages starting...");

    console.log("Waiting for MCP initialization...");
    await mcpInitialized;
    console.log("MCP initialized");

    // Get available tools
    const servers = Array.from(mcpService.getServers().values());
    console.log(`Found ${servers.length} MCP servers`);

    const tools = await Promise.all(
      servers.map(async server => {
        try {
          console.log(`Getting tools for server ${server.getId}...`);
          const serverTools = await server.listTools();
          console.log(`Got ${serverTools.length} tools for server ${server.getId}`);
          return serverTools;
        } catch (e) {
          console.error(`Failed to list tools for server ${server.getId}:`, e);
          return [];
        }
      })
    ).then(serverTools => serverTools.flat());
    console.log(`Total tools found: ${tools.length}`);

    // Get conversation history
    console.log("Getting conversation...", { conversationId });
    const conversation = conversationId
      ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })
      : message
        ? await prisma.conversation.create({
          data: {
            title: message.slice(0, 50),
            workspaceId: '06d07df4-299d-43f2-b4c3-9b66ae8ccd63' // Default workspace
          },
          include: { messages: true }
        })
        : null;
    console.log("Conversation fetched:", conversation?.id);

    if (!conversation) {
      throw new Error('Conversation not found or could not be created');
    }

    console.log("Building message history...");
    const messages = [
      new SystemMessage(buildSystemPrompt(tools)),
      ...conversation.messages.map(msg =>
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      ),
      new HumanMessage(message)
    ];
    console.log("Message history built, count:", messages.length);

    return messages;
  }

  private async handleToolCall(toolCall: any) {
    console.log("handleToolCall:", toolCall);
    const mapping = mcpService.getToolServer(toolCall.name);
    if (!mapping) {
      throw new Error(`No server found for tool: ${toolCall.name}`);
    }

    return await mapping.server.invokeTool(toolCall.name, toolCall.input);
  }


  async streamChat(message: string, conversationId?: string) {
    console.log("Starting streamChat", { message, conversationId });

    try {
      // Create the stream components
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const encoder = new TextEncoder();

      // Start background streaming process
      (async () => {
        try {
          let fullResponse = '';  // Track complete response

          // Get chat stream
          console.log("Starting chain stream...");
          const iterator = await this.chain.stream({
            message,
            conversationId
          });
          console.log("Iterator created");

          // Process all chunks
          for await (const chunk of iterator) {
            if (chunk.content !== undefined) {
              fullResponse += chunk.content;  // Accumulate response
              await writer.write(encoder.encode(JSON.stringify({
                type: 'chunk' as const,
                content: chunk.content
              }) + '\n'));
            }
          }

          // Save the complete response to the database
          if (conversationId && fullResponse) {
            await prisma.message.create({
              data: {
                role: 'assistant',
                content: fullResponse,
                conversationId: conversationId
              }
            });
          }

          console.log("Stream completed");
          await writer.close();
        } catch (error) {
          console.error("Streaming error:", error);
          await writer.abort(error);
        }
      })().catch(error => {
        console.error("Background streaming error:", error);
      });

      // Return readable immediately
      return stream.readable;
    } catch (error) {
      console.error("Stream setup error:", error);
      throw error;
    }
  }
}
