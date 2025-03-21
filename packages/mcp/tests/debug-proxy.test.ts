import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test'
import { MCPServerImpl } from '../src/server'
import type { ServerConfig } from '../src/types'
import { mkdir, rm, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Enable detailed debugging
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

describe('MCPServerImpl Proxy Debug', () => {
    let testDir: TestDirectory;
    let server: MCPServerImpl;
    let filesystemConfig: ServerConfig;
    beforeAll(async () => {
        console.log('Setting up test environment...');
        
        // Create test directory for filesystem server
        testDir = await createTestDirectory();
        await mkdir(join(testDir.path, 'test-dir'), { recursive: true });
        console.log(`Created test directory: ${testDir.path}`);
        
        // Configure filesystem server
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
        
        // Create server instance
        console.log('Creating server instance...');
        server = new MCPServerImpl("filesystem-debug", filesystemConfig);
    });
    
    afterAll(async () => {
        console.log('Cleaning up test environment...');
        try {
            if (server.getState().status !== 'disconnected') {
                await server.stop();
            }
        } catch (e) {
            console.error('Error stopping server:', e);
        }
        await testDir.cleanup();
        console.log('Test environment cleaned up');
    });
    
    test('should start server and correctly initialize proxy', async () => {
        // Start server
        console.log('Starting server...');
        await server.start();
        console.log('Server started successfully');
        
        // Check state
        const state = server.getState();
        console.log(`Server state: ${state.status}`);
        console.log(`Proxy state: ${state.proxy?.state}`);
        
        expect(state.status).toBe('connected');
        expect(state.proxy?.state).toBe('connected');
        
        // There's no stateChanges tracking anymore
        // Just verify the current state
    }, 10000);
    
    test('should list tools successfully', async () => {
        console.log('Listing tools...');
        const tools = await server.listTools();
        console.log(`Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
        
        expect(tools.length).toBeGreaterThan(0);
        expect(tools.some(t => t.name === 'read_file')).toBe(true);
        expect(tools.some(t => t.name === 'write_file')).toBe(true);
    }, 10000);
    
    test('should invoke tools successfully', async () => {
        console.log('Writing test file...');
        await server.invokeTool('write_file', {
            path: '/projects/tmp/debug-test.txt',
            content: 'Debug test content'
        });
        console.log('File written successfully');
        
        console.log('Reading test file...');
        const result = await server.invokeTool('read_file', {
            path: '/projects/tmp/debug-test.txt'
        });
        console.log('File read successfully');
        
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect((result.content as any)[0].text).toBe('Debug test content');
        
        // Check proxy state is still healthy
        const state = server.getState();
        expect(state.proxy?.state).toBe('connected');
        expect(state.proxy?.isHealthy).toBe(true);
    }, 10000);
    
    test('should stop server and clean up proxy', async () => {
        console.log('Stopping server...');
        await server.stop();
        console.log('Server stopped');
        
        const finalState = server.getState();
        expect(finalState.status).toBe('disconnected');
    }, 10000);
});