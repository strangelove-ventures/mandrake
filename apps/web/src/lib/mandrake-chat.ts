import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { mcpService, mcpInitialized } from './mcp';
import { buildSystemPrompt } from './chat';
import { StreamProcessor } from './chat-state';
import { prisma } from './db';

interface ChatInput {
  message: string;
  conversationId?: string;
}

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
    let messageHistory: any[] = [];
    let toolCallInProgress = false;

    return new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Enhanced chunk sending with validation
        const sendChunk = (type: 'chunk' | 'tool_call' | 'tool_result', content: any) => {
          try {
            // Clean up and validate content before sending
            let cleanContent = content;
            if (typeof content === 'string' && content.includes('"content":')) {
              try {
                const parsed = JSON.parse(content);
                cleanContent = parsed.content;
              } catch (e) {
                console.log("[MandrakeChat] Failed to parse JSON chunk:", e);
              }
            }

            const chunk = encoder.encode(
              JSON.stringify({ type, content: cleanContent }) + '\n'
            );
            controller.enqueue(chunk);
          } catch (e) {
            console.error("[MandrakeChat] Error sending chunk:", e);
          }
        };

        // Subscribe to state changes for UI updates
        const unsubscribe = streamProcessor.subscribe((state) => {
          if (state.type === 'streaming' && state.chunk) {
            sendChunk('chunk', state.chunk);
          }
        });

        try {
          messageHistory = await self.buildMessages({ message, conversationId });
          let currentStream = await self.chatModel.stream(messageHistory);

          while (currentStream) {
            const toolCall = await streamProcessor.processStream(currentStream);

            if (toolCall && !toolCallInProgress) {
              // Start tool call processing
              toolCallInProgress = true;

              // Notify about tool call
              sendChunk('tool_call', {
                name: toolCall.name,
                input: toolCall.input
              });

              try {
                // Execute tool
                const result = await self.handleToolCall(toolCall);
                sendChunk('tool_result', result);

                // Update message history with tool interaction
                messageHistory.push(
                  new AIMessage(JSON.stringify({
                    content: [{
                      type: 'tool_use',
                      name: toolCall.name,
                      input: toolCall.input
                    }]
                  })),
                  new HumanMessage(JSON.stringify(result))
                );

                // Continue streaming with updated context
                toolCallInProgress = false;
                currentStream = await self.chatModel.stream(messageHistory);
              } catch (toolError) {
                console.error("[MandrakeChat] Tool execution error:", toolError);
                toolCallInProgress = false;
                throw toolError;
              }
            } else if (!toolCall) {
              // Normal completion - no tool call
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
          unsubscribe(); // Clean up subscription
          controller.close();
        }
      }
    });
  }

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
