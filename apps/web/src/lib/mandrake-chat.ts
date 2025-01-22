import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage, AIMessageChunk } from "@langchain/core/messages";
import { RunnableSequence } from "@langchain/core/runnables";
import { mcpService, mcpInitialized } from './mcp';
import { buildSystemPrompt } from './chat';
import { prisma } from './db';
import { IterableReadableStream } from "@langchain/core/utils/stream";

interface ChatInput {
  message: string;
  conversationId?: string;
}

interface StreamChunk {
  type: 'chunk' | 'tool_call';
  content: string;
}

type StreamState = {
  mode: 'streaming' | 'json_accumulation' | 'tool_execution';
  accumulatedJson: string;
  fullResponse: string;
  currentMessages: any[];
};

export class MandrakeChat {
  private chatModel: ChatOpenAI;
  private chain: RunnableSequence;

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

    this.chain = RunnableSequence.from([
      async (input: ChatInput) => {
        const messages = await this.buildMessages(input);
        return messages;
      },
      this.chatModel
    ]);
  }

  private async buildMessages({ message, conversationId }: ChatInput) {
    await mcpInitialized;

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
    const mapping = mcpService.getToolServer(toolCall.name);
    if (!mapping) {
      throw new Error(`No server found for tool: ${toolCall.name}`);
    }

    try {
      const result = await mapping.server.invokeTool(toolCall.name, toolCall.input);
      return result;
    } catch (error) {
      return {
        error: true,
        message: (error as Error).message || 'Tool execution failed'
      };
    }
  }

  private async handleToolCallAndContinue(
    toolCall: any,
    state: StreamState,
    writer: WritableStreamDefaultWriter,
    encoder: TextEncoder
  ): Promise<IterableReadableStream<AIMessageChunk>> {
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
      state.mode = 'streaming';
      return this.chatModel.stream(state.currentMessages);
    }

    state.currentMessages.push(
      new AIMessage(JSON.stringify({ content: [toolCall] })),
      new HumanMessage(JSON.stringify(result))
    );

    state.mode = 'streaming';
    return this.chatModel.stream(state.currentMessages);
  }

  async streamChat(message: string, conversationId?: string) {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const state: StreamState = {
          mode: 'streaming',
          accumulatedJson: '',
          fullResponse: '',
          currentMessages: await this.buildMessages({ message, conversationId })
        };

        let currentStream = await this.chatModel.stream(state.currentMessages);
        let isDone = false;

        while (!isDone) {
          for await (const chunk of currentStream) {
            if (!chunk.content) continue;

            switch (state.mode) {
              case 'streaming':
                if (chunk.content.toString().trim().startsWith('{')) {
                  state.mode = 'json_accumulation';
                  state.accumulatedJson = chunk.content.toString();
                } else {
                  await writer.write(encoder.encode(JSON.stringify({
                    type: 'chunk',
                    content: chunk.content
                  }) + '\n'));
                  state.fullResponse += chunk.content;
                }
                break;

              case 'json_accumulation':
                state.accumulatedJson += chunk.content;
                try {
                  const parsed = JSON.parse(state.accumulatedJson);
                  if (parsed.content) {
                    const toolCall = parsed.content.find((item: any) => item.type === 'tool_use');
                    if (toolCall) {
                      state.mode = 'tool_execution';
                      currentStream = await this.handleToolCallAndContinue(toolCall, state, writer, encoder);
                    } else {
                      const textContent = parsed.content.find((item: any) => item.type === 'text')?.text;
                      if (textContent) {
                        await writer.write(encoder.encode(JSON.stringify({
                          type: 'chunk',
                          content: textContent
                        }) + '\n'));
                        state.fullResponse += textContent;
                      }
                      state.mode = 'streaming';
                    }
                    state.accumulatedJson = '';
                  }
                } catch {
                  continue;
                }
                break;

              case 'tool_execution':
                state.accumulatedJson += chunk.content;
                break;
            }
          }

          // Check if we should continue
          if (state.mode === 'tool_execution') {
            // We'll get a new stream from handleToolCallAndContinue
            continue;
          } else {
            isDone = true;
          }
        }

        if (conversationId && state.fullResponse) {
          await prisma.message.create({
            data: {
              role: 'assistant',
              content: state.fullResponse,
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
