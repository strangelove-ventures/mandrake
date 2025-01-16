import { DockerMCPService } from '../service';
import { ServerConfig } from '@mandrake/types';
import fs from 'fs/promises';

describe('DockerMCPService', () => {
  let service: DockerMCPService;
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
    service = new DockerMCPService();
  });

  afterEach(async () => {
    await service.cleanup();
  }, 30000);

  describe('filesystem server', () => {
    const testConfig: ServerConfig = {
      id: 'fs1',
      name: 'filesystem',
      image: 'mandrake-test/mcp-filesystem:latest',
      command: ['/data'],
      execCommand: ['/app/dist/index.js', '/data'],
      volumes: [{
        source: testDir,
        target: '/data'
      }]
    };

    it('should initialize filesystem server and list its tools', async () => {
      try {
        // Initialize service with server config
        await service.initialize([testConfig]);
        
        const server = service.getServer(testConfig.id);
        expect(server).toBeDefined();

        // Wait for server to be ready with timeout
        const maxWaitTime = 10000;
        const startTime = Date.now();
        let isReady = false;

        while (Date.now() - startTime < maxWaitTime && !isReady) {
          try {
            await server!.invokeTool('ping', {});
            isReady = true;
          } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        expect(isReady).toBe(true);

        // Get tools list
        const tools = await server!.listTools();
        
        expect(tools).toContainEqual(
          expect.objectContaining({
            name: 'read_file',
            description: expect.any(String)
          })
        );

      } catch (err) {
        console.error('Test failed:', { error: err });
        throw err;
      }
    }, 60000);

    it('should handle server initialization failure', async () => {
      const invalidConfig: ServerConfig = {
        id: 'invalid1',
        name: 'invalid',
        image: 'non-existent-image:latest',
        command: ['/data'],
        execCommand: ['/app/dist/index.js']
      };

      try {
        await service.initialize([invalidConfig]);
        fail('Should have thrown error');
      } catch (err) {
        // Expected to fail
      }

      // Verify no servers were created
      expect(service.getServers().size).toBe(0);
    }, 30000);

    it('should handle server operations', async () => {
      // Initialize service
      await service.initialize([testConfig]);
      const server = service.getServer(testConfig.id);
      expect(server).toBeDefined();

      // Test stop/start/restart
      await server!.stop();
      const stoppedInfo = await server!.getInfo();
      expect(stoppedInfo.State.Running).toBe(false);

      await server!.start();
      const runningInfo = await server!.getInfo();
      expect(runningInfo.State.Running).toBe(true);

      await server!.restart();
      const restartedInfo = await server!.getInfo();
      expect(restartedInfo.State.Running).toBe(true);
    }, 30000);

    it('should cleanup all servers on service cleanup', async () => {
      // Initialize multiple servers
      const config2 = { ...testConfig, id: 'fs2', name: 'filesystem2' };
      await service.initialize([testConfig, config2]);

      // Verify servers are running
      expect(service.getServers().size).toBe(2);

      // Cleanup
      await service.cleanup();

      // Verify all servers were removed
      expect(service.getServers().size).toBe(0);
    }, 30000);
  });
});