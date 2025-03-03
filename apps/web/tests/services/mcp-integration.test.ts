/**
 * Integration tests for MCP server initialization from workspaces
 * 
 * This test focuses on the complete flow of:
 * 1. Creating a workspace with tool configuration
 * 2. Initializing the MCP manager from the workspace
 * 3. Verifying servers are properly started
 * 4. Testing tool invocation through the MCP manager
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
    getServiceRegistry,
    resetServiceRegistryForTesting,
    getMCPManagerForRequest
} from '../../src/lib/services';
import { createTestDirectory } from '../utils/test-dir';
import { MCPManager } from '@mandrake/mcp';
import { randomUUID } from 'crypto';
import { join, resolve } from 'path';

describe('MCP Integration Tests', () => {
    // Test directory
    let testDir: { path: string; cleanup: () => Promise<void> };
    const originalMandrakeRoot = process.env.MANDRAKE_ROOT;
    
    // Test workspace IDs
    let workspaceId: string;
    
    beforeEach(async () => {
        // Create a new test directory
        testDir = await createTestDirectory();
        process.env.MANDRAKE_ROOT = testDir.path;
        
        // Reset service registry
        await resetServiceRegistryForTesting();

        // Get MandrakeManager and create a test workspace
        const registry = getServiceRegistry();
        const mandrakeManager = await registry.getMandrakeManager();
        
        // Create a workspace with a unique name
        const wsName = `ws-${randomUUID().slice(0, 8)}`;
        const workspace = await mandrakeManager.createWorkspace(wsName);
        workspaceId = workspace.id;
        
        // Diagnostic: log environment info
        console.log('\n--- Test Environment Info ---');
        console.log('MANDRAKE_ROOT:', process.env.MANDRAKE_ROOT);
        console.log('Current Directory:', process.cwd());
        console.log('Node Version:', process.version);
        console.log('Platform:', process.platform);
        console.log('----------------------------\n');
    });
    
    afterEach(async () => {
        try {
            // Clean up registry
            await resetServiceRegistryForTesting();
        } catch (error) {
            console.warn('Error during registry cleanup', error);
        }
        
        // Reset environment and clean up directory
        process.env.MANDRAKE_ROOT = originalMandrakeRoot;
        await testDir.cleanup();
    });

    test('should create and initialize MCP manager with ripper tool', async () => {
        // Get the workspace via the registry
        const registry = getServiceRegistry();
        const workspaceManager = await registry.getWorkspaceManager(workspaceId);
        
        // Make sure workspace is initialized
        await workspaceManager.init();
        
        // The default set already includes ripper config - verify this
        const defaultSet = 'default';
        const activeSet = await workspaceManager.tools.getActive();
        expect(activeSet).toBe(defaultSet);
        
        // Get the current ripper configuration
        const ripperConfig = await workspaceManager.tools.getServerConfig(defaultSet, 'ripper');
        console.log('Current ripper config:', ripperConfig);
        
        // Get MCP manager for the workspace
        const mcpManager = await getMCPManagerForRequest(workspaceId);
        expect(mcpManager).toBeInstanceOf(MCPManager);
        
        // Check if servers were started
        try {
            const startedTools = await mcpManager.listAllTools();
            console.log(`Found ${startedTools.length} tools`);
            
            // Verify that ripper tools are available
            expect(startedTools.length).toBeGreaterThan(0);
            expect(startedTools.some(t => t.server === 'ripper')).toBe(true);
            
            // Test invoking a simple tool through the MCP manager
            try {
                const result = await mcpManager.invokeTool('ripper', 'list_allowed_directories', {});
                expect(result).toBeDefined();
                
                // Check for content in the expected format from ripper
                expect(result.content).toBeDefined();
                expect(Array.isArray(result.content)).toBe(true);
                
                // Verify directories are listed
                const textContent = (result as any).content.find((item: { type: string; }) => item.type === 'text');
                expect(textContent).toBeDefined();
                
                // Make sure the output contains the workspace path
                const jsonContent = JSON.parse(textContent.text);
                expect(jsonContent.directories).toBeDefined();
                expect(Array.isArray(jsonContent.directories)).toBe(true);
                expect(jsonContent.directories.length).toBeGreaterThan(0);
                expect(jsonContent.directories[0].path).toContain(workspaceManager.paths.root);
            } catch (error) {
                console.error('Tool invocation failed:', error);
                throw error; // Re-throw to fail the test
            }
        } catch (error) {
            console.error('Failed to list tools:', error);
            throw error;
        }
    }, 30000); // Increase timeout for server startup

    test('should get same MCP manager instance for same workspace', async () => {
        // Get the workspace via the registry
        const registry = getServiceRegistry();
        const workspaceManager = await registry.getWorkspaceManager(workspaceId);
        
        // Get MCP manager twice
        const mcpManager1 = await getMCPManagerForRequest(workspaceId);
        const mcpManager2 = await getMCPManagerForRequest(workspaceId);
        
        // Check they're the same instance
        expect(mcpManager2).toBe(mcpManager1);
        
        // Verify servers are running
        const tools = await mcpManager1.listAllTools();
        expect(tools.some(t => t.server === 'ripper')).toBe(true);
    }, 30000);

    test('should create and use SessionCoordinator with working MCPManager', async () => {
        // Get the workspace and configure tools
        const registry = getServiceRegistry();
        const workspaceManager = await registry.getWorkspaceManager(workspaceId);
        
        // Create a test session
        const session = await workspaceManager.sessions.createSession({
            title: 'MCP Integration Test Session'
        });
        
        // Get session coordinator
        const sessionCoordinator = await registry.getSessionCoordinator(
            workspaceId, 
            workspaceManager.paths.root, 
            session.id
        );
        
        // Check if MCP manager is properly initialized
        expect(sessionCoordinator.opts.mcpManager).toBeDefined();
        
        // Directly access tool servers from MCP manager
        const mcpManager = sessionCoordinator.opts.mcpManager;
        const tools = await mcpManager.listAllTools();
        expect(tools.some((t: { server: string; }) => t.server === 'ripper')).toBe(true);
        
        // Test tool invocation through session coordinator's MCP manager
        try {
            const result = await mcpManager.invokeTool('ripper', 'list_allowed_directories', {});
            expect(result).toBeDefined();
            expect(result.content).toBeDefined();
        } catch (error) {
            console.error('Tool invocation through session coordinator failed:', error);
            throw error;
        }
    }, 30000);
});