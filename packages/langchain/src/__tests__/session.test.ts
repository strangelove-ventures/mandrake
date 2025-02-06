import { test, expect, jest, describe, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { DockerMCPService } from '@mandrake/mcp';
import { SessionCoordinator } from '../session/coordinator';
import { AnthropicProvider } from '../providers/anthropic';

describe('Session with Tools', () => {
  let prisma: PrismaClient;
  let mcpService: DockerMCPService;
  let coordinator: SessionCoordinator;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Initialize MCP Service with a test tool
    mcpService = new DockerMCPService();
    await mcpService.initialize([{
      id: 'fetch',
      name: `fetch-${Date.now()}`,
      image: 'ghcr.io/strangelove-ventures/mcp/fetch:latest',  // TODO: use production image
      command: [],
      execCommand: ['mcp-server-fetch']
      // No volumes needed for fetch server
    }]);

    // Create session coordinator
    const provider = new AnthropicProvider({
      model: 'claude-3-opus-20240229',
      apiKey: process.env.ANTHROPIC_API_KEY!,
      streaming: true
    });

    coordinator = new SessionCoordinator(prisma, {
      workspaceId: 'test-workspace',
      systemPrompt: 'You are a helpful assistant that uses tools when appropriate.',
      provider
    });
  });

  afterAll(async () => {
    await mcpService.cleanup();
    await prisma.$disconnect();
  });

  test('conversation with tool usage', async () => {
    // Create a new session
    const session = await coordinator.createSession('Tool Test Session');

    // First message to initialize conversation
    const round1 = await coordinator.sendMessage(
      session.id,
      "Can you help me read the test data?",
      mcpService
    );

    // Verify turns were created that include tool usage
    const response1 = await prisma.response.findUnique({
      where: { id: round1.responseId },
      include: { turns: true }
    });

    expect(response1?.turns).toBeDefined();

    // There should be at least one tool call
    const toolCall = response1?.turns.find(t => t.toolCall);
    expect(toolCall).toBeDefined();

    // And subsequently a tool result
    const toolResult = response1?.turns.find(t => t.toolResult);
    expect(toolResult).toBeDefined();

    // The final turn should be content using the tool result
    const lastTurn = response1?.turns[response1.turns.length - 1];
    expect(lastTurn?.content).toBeDefined();
  });
});