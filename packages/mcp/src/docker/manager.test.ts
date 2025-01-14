import { MCPServerManager } from './manager';

describe('MCPServerManager', () => {
  let manager: MCPServerManager;

  beforeAll(async () => {
    // Clean up any leftover containers from previous test runs
    const tempManager = new MCPServerManager();
    await tempManager.cleanupOrphanedContainers();
  });

  beforeEach(() => {
    manager = new MCPServerManager();
  });


  afterEach(async () => {
    // Clean up both tracked and untracked containers
    const servers = await manager.listServers();
    await Promise.all(servers.map(name => manager.stopServer(name)));
    await manager.cleanupOrphanedContainers();
  });

  it('should start filesystem server and list its tools', async () => {
    // Start the server
    await manager.startServer({
      name: 'filesystem',
      image: 'mandrake-test/mcp-filesystem:latest',
      volumes: [{
        source: '/tmp/mcp-test',
        target: '/data'
      }]
    });

    // Verify it's running
    const servers = await manager.listServers();
    expect(servers).toContain('filesystem');

    // Get its tools
    const tools = await manager.listServerTools('filesystem');
    expect(tools.tools).toContainEqual(
      expect.objectContaining({
        name: 'read_file',
        description: expect.any(String)
      })
    );

    // Stop server and verify cleanup
    await manager.stopServer('filesystem');
    const remainingServers = await manager.listServers();
    expect(remainingServers).not.toContain('filesystem');
  }, 30000); // Extend timeout since we're working with containers
});