import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { MCPManager } from '../src/manager'
import type { ServerConfig } from '../src/types'
import { mkdir, rm, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Enable more debugging
process.env.DEBUG = 'mcp:*';
process.env.DEBUG_MCP_PROXY = 'true';

interface TestDirectory {
    path: string;
    cleanup: () => Promise<void>;
}

async function createTestDirectory(prefix: string = 'mandrake-mcp-test-'): Promise<TestDirectory> {
    const path = await mkdtemp(join(tmpdir(), prefix));
    return {
        path,
        cleanup: async () => {
            await rm(path, { recursive: true, force: true });
        }
    };
}

describe('MCP Server List Tools', () => {
    let testDir: TestDirectory;
    let manager: MCPManager;
    let filesystemConfig: ServerConfig;
    let memoryConfig: ServerConfig;
    let fetchConfig: ServerConfig;
    
    beforeAll(async () => {
        console.log('Setting up test environment...');
        
        // Create test directory for filesystem server
        testDir = await createTestDirectory();
        await mkdir(join(testDir.path, 'test-dir'), { recursive: true });
        console.log(`Created test directory: ${testDir.path}`);
        
        // Configure servers
        filesystemConfig = {
            command: 'docker',
            args: [
                'run',
                '--rm',
                '-i',
                '--mount',
                `type=bind,src=${testDir.path},dst=/projects/tmp`,
                'mcp/filesystem',
                '/projects'
            ]
        };
        
        memoryConfig = {
            command: 'docker',
            args: [
                'run',
                '--rm',
                '-i',
                'mcp/memory'
            ]
        };
        
        fetchConfig = {
            command: 'docker',
            args: [
                'run',
                '--rm',
                '-i',
                'mcp/fetch'
            ]
        };
        
        // Create manager
        manager = new MCPManager();
    });
    
    afterAll(async () => {
        console.log('Cleaning up test environment...');
        await manager.cleanup();
        await testDir.cleanup();
        console.log('Test environment cleaned up');
    });
    
    test('should connect to and list tools from all servers', async () => {
        // Start each server
        console.log('Starting filesystem server...');
        await manager.startServer('filesystem', filesystemConfig);
        console.log('Filesystem server started');
        
        // Check server state
        const fsState = manager.getServerState('filesystem');
        expect(fsState?.status).toBe('connected');
        
        console.log('Starting memory server...');
        await manager.startServer('memory', memoryConfig);
        console.log('Memory server started');
        
        console.log('Starting fetch server...');
        await manager.startServer('fetch', fetchConfig);
        console.log('Fetch server started');
        
        // List tools from each server
        console.log('Listing tools from each server...');
        
        const filesystemTools = await manager.getServer('filesystem')!.listTools();
        console.log('Filesystem tools:', filesystemTools.map(t => t.name).join(', '));
        expect(filesystemTools.length).toBeGreaterThan(0);
        
        const memoryTools = await manager.getServer('memory')!.listTools();
        console.log('Memory tools:', memoryTools.map(t => t.name).join(', '));
        expect(memoryTools.length).toBeGreaterThan(0);
        
        const fetchTools = await manager.getServer('fetch')!.listTools();
        console.log('Fetch tools:', fetchTools.map(t => t.name).join(', '));
        expect(fetchTools.length).toBeGreaterThan(0);
        
        // List all tools
        console.log('Getting combined tool list...');
        const allTools = await manager.listAllTools();
        
        // Verify we have tools from each server
        expect(allTools.some(t => t.server === 'filesystem')).toBe(true);
        expect(allTools.some(t => t.server === 'memory')).toBe(true);
        expect(allTools.some(t => t.server === 'fetch')).toBe(true);
        
        // Group tools by server for logging
        const toolsByServer = new Map<string, string[]>();
        allTools.forEach(tool => {
            if (!toolsByServer.has(tool.server)) {
                toolsByServer.set(tool.server, []);
            }
            toolsByServer.get(tool.server)!.push(tool.name);
        });
        
        for (const [server, tools] of toolsByServer.entries()) {
            console.log(`${server}: ${tools.join(', ')}`);
        }
    }, 30000); // Extend timeout to 30s
});