import { MCPServerManager } from '../manager';
import fs from 'fs/promises';

describe('MCPServerManager', () => {
  let manager: MCPServerManager;
  let testDir: string;

  beforeAll(async () => {
    // Create test directory
    testDir = `/tmp/mcp-test-${Date.now()}`;
    await fs.mkdir(testDir, { recursive: true });
  }, 10000);

  afterAll(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true }).catch(console.error);
  }, 10000);

  beforeEach(() => {
    manager = new MCPServerManager();
  });

  afterEach(async () => {
    // Let any pending operations complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Cleanup all servers and containers
    await manager.cleanup();
  }, 10000);

  describe('filesystem server', () => {
    it('should start filesystem server and list its tools', async () => {
      let server;
      try {
        // Start the server
        server = await manager.startServer({
          name: 'filesystem',
          image: 'mandrake-test/mcp-filesystem:latest',
          command: ['/data'],
          execCommand: ['/app/dist/index.js', '/data'],
          volumes: [{
            source: testDir,
            target: '/data'
          }]
        });

        // Wait for server to be ready with timeout
        const maxWaitTime = 10000;
        const startTime = Date.now();
        let isReady = false;

        while (Date.now() - startTime < maxWaitTime && !isReady) {
          try {
            await server.callTool('ping', {});
            isReady = true;
          } catch (err) {
            console.log('Waiting for server to be ready...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        expect(isReady).toBe(true);

        // Get tools list using the client protocol method
        const tools = await server.state.client!.listTools();

        expect(tools.tools).toContainEqual(
          expect.objectContaining({
            name: 'read_file',
            description: expect.any(String)
          })
        );

        // Clean shutdown
        await server.stop();
        expect(server.getState().status).toBe('stopped');

      } catch (err) {
        console.error('Test failed:', { error: err });
        throw err;
      }
    }, 60000);

    it('should handle container cleanup on failure', async () => {
      try {
        await manager.startServer({
          name: 'invalid',
          image: 'non-existent-image:latest',
          command: ['/data'],
          execCommand: ['/app/dist/index.js'],
        });
      } catch (err) {
        // Expected to fail
      }

      // Give Docker time to finish any cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify no orphaned containers
      const containers = await manager.listManagedContainers();
      expect(containers).toHaveLength(0);
    }, 30000);

    it('should track container health', async () => {
      const healthChanges: boolean[] = [];
      let server;

      try {
        server = await manager.startServer({
          name: 'filesystem',
          image: 'mandrake-test/mcp-filesystem:latest',
          command: ['/data'],
          execCommand: ['/app/dist/index.js', '/data'],
          volumes: [{
            source: testDir,
            target: '/data'
          }],
          healthCheck: {
            interval: 1000,
            maxRetries: 3
          }
        });

        server.on('healthChange', (health) => {
          healthChanges.push(health.healthy);
        });

        // Wait for initial health check
        await new Promise(resolve => setTimeout(resolve, 2000));
        expect(healthChanges).toContain(true);

        // Stop server and verify health changes
        await server.stop();
        await new Promise(resolve => setTimeout(resolve, 2000));
        expect(healthChanges).toContain(false);

      } catch (err) {
        console.error('Health check test failed:', {
          error: err,
          healthChanges
        });
        throw err;
      }
    }, 30000);
  });
});