import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { mcpService, mcpInitialized } from './mcp';
import { buildSystemPrompt } from './chat';
import { 
  getSessionMessages, 
  newRoundForSession,
  getOrCreateSession,
  newToolCallTurn,
  newToolResultTurn,
  newContentTurn
} from '@mandrake/storage';
import { dbInitialized } from './init';

interface ToolCall {
  name: string;
  input: any;
}

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

  private async buildMessages(message: string, sessionId?: string) {
    await mcpInitialized;
    const tools = await this.getAvailableTools();
    
    const messages = sessionId 
      ? await getSessionMessages(sessionId)
      : [];

    return [
      new SystemMessage(buildSystemPrompt(tools)),
      ...messages.map(msg =>
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      ),
      new HumanMessage(message)
    ];
  }

  private async handleToolCall(toolCall: ToolCall): Promise<any> {
    const mapping = mcpService.getToolServer(toolCall.name);
    if (!mapping) throw new Error(`No server found for tool: ${toolCall.name}`);
    return await mapping.server.invokeTool(toolCall.name, toolCall.input);
  }

  async streamChat(message: string, sessionId?: string) {
    const self = this;
    return new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const sendChunk = (type: string, content: any) => {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type, content }) + '\n')
          );
        };

        try {
          // Initialize session and round
          const workspaceId = await dbInitialized;
          const session = await getOrCreateSession(
            workspaceId,
            sessionId,
            message.slice(0, 50)
          );

          const round = await newRoundForSession(session.id, message);
          if (!round) throw new Error('Failed to create round');

          const messageHistory = await self.buildMessages(message, session.id);
          let currentTurnIndex = 0;

          // Start streaming
          let stream = await self.chatModel.stream(messageHistory);
          let currentBuffer = '';

          // Process the stream
          for await (const chunk of stream) {
            if (!chunk.content) continue;

            console.log('Stream chunk:', chunk.content);
            currentBuffer += chunk.content;
            console.log('Current buffer:', currentBuffer);

            // Check for complete tool calls
            if (isToolCall(currentBuffer)) {
              console.log('Detected tool call, parsing...');
              const toolCall = parseToolCall(currentBuffer);
              console.log('Parsed tool call:', toolCall);
              currentBuffer = '';

              if (!toolCall) {
                throw new Error('Failed to parse tool call');
              }

              // Record tool call
              const serverId = mcpService.getToolServer(toolCall.name)?.server.getId();
              if (!serverId) throw new Error(`No server found for tool: ${toolCall.name}`);

              await newToolCallTurn(
                round.response.id,
                currentTurnIndex++,
                serverId,
                toolCall.name,
                toolCall.input
              );

              // Send tool call to client
              sendChunk('tool_call', {
                name: toolCall.name,
                server: serverId,
                input: toolCall.input
              });

              // Execute tool and record result
              const result = await self.handleToolCall(toolCall);
              await newToolResultTurn(
                round.response.id,
                currentTurnIndex++,
                result
              );

              // Send result to client
              sendChunk('tool_result', result);

              // Update message history and continue streaming
              messageHistory.push(
                new AIMessage(JSON.stringify(toolCall)),
                new HumanMessage(JSON.stringify(result))
              );
              stream = await self.chatModel.stream(messageHistory);
            } else {
              // Only send chunk if it's not part of a tool call
              sendChunk('chunk', chunk.content);
            }
          }

          // Save final content if any remains
          if (currentBuffer) {
            await newContentTurn(
              round.response.id,
              currentTurnIndex,
              currentBuffer
            );
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

function isToolCall(text: string): boolean {
  try {
    console.log('Checking for tool call:', text);
    const parsed = JSON.parse(text);
    const result = parsed.content &&
      Array.isArray(parsed.content) &&
      parsed.content.some((item: any) => item.type === 'tool_use');
    console.log('Is tool call?', result);
    return result;
  } catch (e) {
    console.log('Failed to parse JSON:', e);
    return false;
  }
}

function parseToolCall(text: string): ToolCall | null {
  try {
    const parsed = JSON.parse(text);
    const toolUse = parsed.content?.find((item: any) => item.type === 'tool_use');
    if (!toolUse) return null;

    return {
      name: toolUse.name,
      input: toolUse.input
    };
  } catch {
    return null;
  }
}
