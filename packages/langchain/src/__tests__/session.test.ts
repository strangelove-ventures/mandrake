import { PrismaClient } from '@prisma/client';
import { DockerMCPService } from '@mandrake/mcp';
import path from 'path';
import { SessionCoordinator } from '../session/coordinator';
import { AnthropicProvider } from '../providers/anthropic';
import { DbConfig, DatabaseManager } from '@mandrake/storage';

// Define test setup locally
async function setupTestDatabase() {
  const config = new DbConfig(
    'mandrake-postgres-test',
    'postgres:14-alpine',
    'postgres',
    'password',
    'mandrake_test',
    '5433',
    path.join(process.cwd(), 'testdb')
  );

  const dbManager = new DatabaseManager(config);
  await dbManager.startContainer();

  const testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://${config.user}:${config.password}@localhost:${config.port}/${config.database}`
      }
    }
  });

  return {
    prisma: testPrisma,
    cleanup: async () => {
      await dbManager.cleanDb();
    }
  };
}

describe('Session with Tools', () => {
  let testPrisma: PrismaClient;
  let mcpService: DockerMCPService;
  let coordinator: SessionCoordinator;
  let cleanup: () => Promise<void>;
  let workspaceId: string;

  beforeAll(async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for tests');
    }

    // Set up test database
    const db = await setupTestDatabase();
    if (!db.prisma) {
      throw new Error('Failed to set up test database');
    }
    testPrisma = db.prisma;
    cleanup = db.cleanup;

    // Create test workspace
    const workspace = await testPrisma.workspace.create({
      data: {
        name: 'Test Workspace',
        description: 'Workspace for testing'
      }
    });
    workspaceId = workspace.id;

    // Initialize MCP Service with fetch tool
    mcpService = new DockerMCPService();
    await mcpService.initialize([{
      id: 'fetch',
      name: `fetch-${Date.now()}`,
      image: 'ghcr.io/strangelove-ventures/mcp/fetch:latest',
      command: [],
      execCommand: ['mcp-server-fetch']
    }]);

    // Create session coordinator with real Anthropic provider
    const provider = new AnthropicProvider({
      model: 'claude-3-opus-20240229',
      apiKey: process.env.ANTHROPIC_API_KEY,
      streaming: true
    });

    coordinator = new SessionCoordinator(testPrisma, {
      workspaceId,
      systemPrompt: 'You are a helpful assistant. When asked about websites or URLs, use the fetch tool to get the content.',
      provider
    });
  }, 30000);

  afterAll(async () => {
    await mcpService.cleanup();
    await testPrisma.$disconnect();
    await cleanup();
  }, 30000);

  test('conversation with tool usage', async () => {
    const session = await coordinator.createSession('Tool Test Session');

    const round1 = await coordinator.sendMessage(
      session.id,
      "What's on the homepage of example.com?",
      mcpService
    );

    const response1 = await testPrisma.response.findUnique({
      where: { id: round1.responseId },
      include: {
        turns: {
          orderBy: { index: 'asc' }
        }
      }
    });

    expect(response1?.turns).toBeDefined();
    expect(response1?.turns.length).toBeGreaterThan(0);

    // Verify tool interaction occurred
    const toolCall = response1?.turns.find(t => t.toolCall);
    expect(toolCall).toBeDefined();
    if (toolCall && toolCall.toolCall) {
      expect((toolCall.toolCall as any).server).toBe('fetch');
    }

    // Should have a tool result
    const toolResult = response1?.turns.find(t => t.toolResult);
    expect(toolResult).toBeDefined();

    // Should have content that uses the fetched data
    const contentTurns = response1?.turns.filter(t => t.content);
    expect(contentTurns?.length).toBeGreaterThan(0);
  }, 60000); // Increased timeout for real API call
});