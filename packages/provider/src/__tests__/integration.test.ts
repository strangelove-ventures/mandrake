import { DockerMCPService } from '@mandrake/mcp';
import { db } from '@mandrake/storage';
import { ProviderService } from '../service';
import * as dotenv from 'dotenv';

dotenv.config();

const TEST_TOOLS = [
  {
    id: 'filesystem',
    name: 'filesystem-test',
    image: 'ghcr.io/strangelove-ventures/mcp/git:latest',
    execCommand: ['node', 'dist/index.js']
  }
];

describe('Provider Integration', () => {
  let providerService: ProviderService;
  let mcpService: DockerMCPService;

  beforeAll(async () => {
    mcpService = new DockerMCPService();
    await mcpService.initialize(TEST_TOOLS);

    providerService = new ProviderService({
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4096,
      temperature: 0.7
    }, mcpService);

    await db.connect();
  });

  afterAll(async () => {
    await mcpService.cleanup();
    await db.disconnect();
  });

  it('processes message with tool calls', async () => {
    const session = await db.sessions.create({
      data: {
        workspaceId: 'test',
        title: 'Integration Test'
      }
    });

    const result = await providerService.processMessage(
      "You are a helpful assistant with access to tools.",
      [
        { role: "user", content: "List the files in the current directory." }
      ]
    );

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.usage.totalCost).toBeGreaterThan(0);
    
    // Verify tool usage
    const toolCalls = result.chunks.filter(c => c.type === 'tool_call');
    expect(toolCalls.length).toBeGreaterThan(0);
    expect(toolCalls[0].tool).toBe('filesystem');

    // Verify usage tracking
    const usage = await db.sessionUsage.findFirst({
      where: { sessionId: session.id }
    });
    expect(usage).toBeDefined();
  });
});
