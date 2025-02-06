import { PrismaClient } from '@prisma/client';
import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { BaseProvider } from '../providers';
import { DockerMCPService as MCPServer } from '@mandrake/mcp';
import { BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";

export interface SessionConfig {
  workspaceId: string;
  systemPrompt: string;
  provider: BaseProvider;
}

interface ToolCallbackOptions extends BaseChatModelCallOptions {
  tools?: Record<string, unknown>[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
}

export class SessionCoordinator {
  private prisma: PrismaClient;
  private provider: BaseProvider;
  private systemPrompt: string;
  private workspaceId: string;

  constructor(prisma: PrismaClient, config: SessionConfig) {
    this.prisma = prisma;
    this.provider = config.provider;
    this.systemPrompt = config.systemPrompt;
    this.workspaceId = config.workspaceId;
  }

  private async getRoundHistory(sessionId: string): Promise<BaseMessage[]> {
    const rounds = await this.prisma.round.findMany({
      where: { sessionId },
      include: {
        request: true,
        response: {
          include: {
            turns: {
              orderBy: { index: 'asc' }
            }
          }
        }
      },
      orderBy: { index: 'asc' }
    });

    const messages: BaseMessage[] = [new SystemMessage(this.systemPrompt)];

    for (const round of rounds) {
      // Add the human message
      messages.push(new HumanMessage(round.request.content));

      // Add any assistant messages/tool calls
      let assistantContent = '';
      for (const turn of round.response.turns) {
        if (turn.content) {
          assistantContent += turn.content;
        }
      }
      if (assistantContent) {
        messages.push(new AIMessage(assistantContent));
      }
    }

    return messages;
  }

  async createSession(title?: string) {
    return this.prisma.session.create({
      data: {
        title,
        workspaceId: this.workspaceId
      }
    });
  }

  async sendMessage(
    sessionId: string,
    content: string,
    mcpService: MCPServer
  ) {
    // Create the request and initial round
    const request = await this.prisma.request.create({
      data: { content }
    });

    const response = await this.prisma.response.create({
      data: {}
    });

    const round = await this.prisma.round.create({
      data: {
        sessionId,
        requestId: request.id,
        responseId: response.id,
        index: await this.getNextRoundIndex(sessionId)
      }
    });

    // Get conversation history
    const history = await this.getRoundHistory(sessionId);

    // Get tools from MCP service
    const tools = await mcpService.getToolsForModel();

    // Configure tool options
    const options: ToolCallbackOptions = {
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : "none",
    };

    // Start streaming response
    let currentTurnIndex = 0;
    await this.provider.generateStream(
      [...history, new HumanMessage(content)],
      async (turn) => {
        if (turn.type === 'content') {
          await this.prisma.turn.create({
            data: {
              responseId: response.id,
              index: currentTurnIndex++,
              content: turn.content
            }
          });
        } else if (turn.type === 'tool_call') {
          await this.prisma.turn.create({
            data: {
              responseId: response.id,
              index: currentTurnIndex++,
              toolCall: turn.toolCall
            }
          });
        } else if (turn.type === 'tool_result') {
          await this.prisma.turn.create({
            data: {
              responseId: response.id,
              index: currentTurnIndex++,
              toolResult: turn.toolResult
            }
          });
        }
      },
      options
    );

    return round;
  }

  private async getNextRoundIndex(sessionId: string): Promise<number> {
    const lastRound = await this.prisma.round.findFirst({
      where: { sessionId },
      orderBy: { index: 'desc' }
    });
    return (lastRound?.index ?? -1) + 1;
  }
}