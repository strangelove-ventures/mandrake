// packages/mcp/src/docker/__tests__/test-servers.test.ts
import { DockerMCPService } from '../service';
import fs from 'fs/promises';
import { ServerConfig, MCPServer } from '@mandrake/types';
import { TestDirectory, prepareTestDirectory } from './test-utils';

// Core servers we want to verify MCP compatibility with
function getTestServers(testDirs: TestDirectory[]): ServerConfig[] {
    return [
        {
            id: 'filesystem',
            name: `filesystem-integration-test-${Date.now()}`,
            image: 'mandrake-test/mcp-filesystem:latest',
            command: ['/data'],
            execCommand: ['/app/dist/index.js', '/data'],
            volumes: [{
                source: testDirs.find(d => d.type === 'filesystem')!.path,
                target: '/data'
            }]
        },
        {
            id: 'git',
            name: `git-integration-test-${Date.now()}`,
            image: 'mandrake-test/mcp-git:latest',
            command: [],
            execCommand: ['mcp-server-git'],
            volumes: [{
                source: testDirs.find(d => d.type === 'git')!.path,
                target: '/workspace',
                mode: 'rw'
            }]
        },
        {
            id: 'memory',
            name: `memory-integration-test-${Date.now()}`,
            image: 'mandrake-test/mcp-memory:latest',
            command: ['node', '/app/dist/index.js'],
            execCommand: ['node', '/app/dist/index.js'],
            volumes: [{
                source: testDirs.find(d => d.type === 'memory')!.path,
                target: '/app/data',
                mode: 'rw'
            }]
        }
    ];
}

describe('MCP Test Servers', () => {
    let service: DockerMCPService;
    let testDirs: TestDirectory[] = [];
    let testServers: ServerConfig[] = [];


    beforeAll(async () => {
        console.log('Test setup starting...');
        // Prepare test directories for each server type
        const fsDir = await prepareTestDirectory('filesystem');
        const gitDir = await prepareTestDirectory('git');
        const memoryDir = await prepareTestDirectory('memory');
        testDirs.push(fsDir, gitDir, memoryDir);

        console.log('Test directories prepared:', {
            filesystem: fsDir.path,
            git: gitDir.path
        });

        // Generate test server configs with prepared directories
        testServers = getTestServers(testDirs);
    });



    beforeEach(() => {
        service = new DockerMCPService();
    });

    afterEach(async () => {
        await service.cleanup();
    });

    afterAll(async () => {
        // Cleanup all test directories
        await Promise.all(
            testDirs.map(dir => fs.rm(dir.path, { recursive: true, force: true }))
        );
    });

    const waitForServer = async (server: MCPServer, timeout = 10000): Promise<boolean> => {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                console.log(`Attempting list_tools for server ${server.getId()}...`);
                const tools = await server.listTools();
                console.log(`list_tools successful for server ${server.getId()}:`, tools.map(t => t.name));
                return true;
            } catch (err) {
                console.error(`list_tools failed for server ${server.getId()}:`, err);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        console.log(`Server ${server.getId()} failed to respond to list_tools within timeout`);
        return false;
    };

    it('should run multiple MCP servers concurrently', async () => {
        console.log('Starting concurrent server test');

        // Initialize all servers at once
        await service.initialize(testServers);
        console.log('Service initialized');
        // Wait for all servers to be ready
        const serverChecks = await Promise.all(
            testServers.map(async config => {
                console.log(`Checking server ${config.id}...`);
                const server = service.getServer(config.id);
                expect(server).toBeDefined();
                const ready = waitForServer(server!);
                console.log(`Server ${config.id} ready status:`, ready);
                return ready;
            })
        );
        console.log('All server checks complete:', serverChecks);

        // Verify all servers started
        expect(serverChecks.every(ready => ready)).toBe(true);

        // Test parallel operations on all servers
        const results = await Promise.all(
            testServers.map(async config => {
                console.log(`Testing operations for ${config.id}`);
                const server = service.getServer(config.id)!;

                // Get tool list
                const tools = await server.listTools();
                console.log(`${config.id} tools:`, tools.map(t => t.name));

                expect(tools.length).toBeGreaterThan(0);
                expect(tools[0]).toHaveProperty('name');
                expect(tools[0]).toHaveProperty('description');

                // Basic tool invocation
                const info = await server.getInfo();
                console.log(`${config.id} info:`, {
                    running: info.State.Running,
                    status: info.State.Status,
                });
                expect(info.State.Running).toBe(true);

                return true;
            })
        );

        // All operations should succeed
        expect(results.every(r => r)).toBe(true);

        // Verify we can still get all server info
        const servers = service.getServers();
        expect(servers.size).toBe(testServers.length);
    }, 120000); // 2 minutes total for all servers

    it('should handle service-wide operations', async () => {
        // Initialize all servers
        await service.initialize(testServers);

        // Verify initial state
        expect(service.getServers().size).toBe(testServers.length);

        // Test cleanup and reinitialization
        await service.cleanup();
        expect(service.getServers().size).toBe(0);

        // Should be able to initialize again
        await service.initialize(testServers);
        expect(service.getServers().size).toBe(testServers.length);
    }, 60000);
});
