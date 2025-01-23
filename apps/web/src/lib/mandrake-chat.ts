import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { mcpService, mcpInitialized } from './mcp';
import { buildSystemPrompt } from './chat';
import { StreamProcessor } from './chat-state';
import { 
  prisma,
  getSessionMessages, 
  newRoundForSession,
  getOrCreateSession,
  newToolCallTurn,
  newToolResultTurn,
  newContentTurn
} from '@mandrake/storage';
import { dbInitialized } from './init';

interface ChatInput {
  message: string;
  sessionId?: string;
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
    
    // Use new session message format
    const messages = input.sessionId 
      ? await getSessionMessages(input.sessionId)
      : [];

    return [
      new SystemMessage(buildSystemPrompt(tools)),
      ...messages.map(msg =>
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

  async streamChat(message: string, sessionId?: string) {
    const self = this;
    const streamProcessor = new StreamProcessor();
    let messageHistory: any[] = [];
    let toolCallInProgress = false;
    let currentSession;
    let currentRound;
    let currentResponse;

    return new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendChunk = (type: 'chunk' | 'tool_call' | 'tool_result', content: any) => {
          try {
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

        const unsubscribe = streamProcessor.subscribe((state) => {
          if (state.type === 'streaming' && state.chunk) {
            sendChunk('chunk', state.chunk);
          }
        });

        try {
          // Get or create session first
          const workspaceId = await dbInitialized;
          currentSession = await getOrCreateSession(
            workspaceId,
            sessionId,
            message.slice(0, 50)
          );

          if (!currentSession) throw new Error('Session not found or could not be created');

          // Build message history
          messageHistory = await self.buildMessages({ 
            message, 
            sessionId: currentSession.id 
          });

          // Get or create round with request and response
          currentRound = await newRoundForSession(currentSession.id, message);
          if (!currentRound) throw new Error('Failed to create round');
          // Now we have full objects via Prisma's include
          currentResponse = currentRound.response;
          let currentTurnIndex = 0;

          // Start streaming
          let currentStream = await self.chatModel.stream(messageHistory);

          while (currentStream) {
            const toolCall = await streamProcessor.processStream(currentStream);

            if (toolCall && !toolCallInProgress) {
              toolCallInProgress = true;

              // Create tool call turn
              let serverId =  mcpService.getToolServer(toolCall.name)?.server.getId()
              if (serverId === undefined) {
                throw new Error(`No server found for tool: ${toolCall.name}`);
              }
              await newToolCallTurn(
                currentResponse.id,
                currentTurnIndex++,
                serverId,
                toolCall.name,
                toolCall.input
              );

              sendChunk('tool_call', {
                name: toolCall.name,
                input: toolCall.input
              });

              try {
                const result = await self.handleToolCall(toolCall);

                // Create tool result turn
                await newToolResultTurn(
                  currentResponse.id,
                  currentTurnIndex++,
                  result
                );

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

                toolCallInProgress = false;
                currentStream = await self.chatModel.stream(messageHistory);
              } catch (toolError) {
                console.error("[MandrakeChat] Tool execution error:", toolError);
                toolCallInProgress = false;
                throw toolError;
              }
            } else if (!toolCall) {
              // Final text response - create content turn
              const fullResponse = streamProcessor.getFullResponse();
              if (fullResponse) {
                await newContentTurn(
                  currentResponse.id,
                  currentTurnIndex++,
                  fullResponse
                );
              }
              break;
            }
          }

        } catch (error) {
          console.error("[MandrakeChat] Stream error:", error);
          controller.error(error);
        } finally {
          unsubscribe();
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
}