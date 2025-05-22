import { describe, test, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager, type ServerConfig } from '@mandrake/mcp';
import { SessionCoordinator } from '../../src/coordinator';
import { createTestDirectory, type TestDirectory } from '../utils/testdir';
import type { WorkspacePaths } from '@mandrake/workspace';
import { config } from 'dotenv';
import { resolve } from 'path';

function getServerConfigs(paths: WorkspacePaths): Record<string, ServerConfig> {
    // Return empty - we'll use the default tools from workspace
    return {};
}

describe('Session Integration', () => {
    const WORKSPACE_NAME = 'test-workspace';

    let testDir: TestDirectory;
    let workspace: WorkspaceManager;
    let mcpManager: MCPManager;
    let coordinator: SessionCoordinator;

    beforeAll(async () => {
        config({ path: resolve(__dirname, '../../.env') });
    });

    beforeEach(async () => {
        testDir = await createTestDirectory();

        workspace = new WorkspaceManager(testDir.path, WORKSPACE_NAME, crypto.randomUUID());
        await workspace.init('Test Workspace');

        // Update the API keys for the providers
        await workspace.models.updateProvider('anthropic', {
            apiKey: process.env.ANTHROPIC_API_KEY
        });

        await workspace.models.updateProvider('xai', {
            apiKey: process.env.XAI_API_KEY
        });
        
        mcpManager = new MCPManager();
        
        // Get default tools from workspace and start them
        const defaultTools = await workspace.tools.getConfigSet('default');
        await Promise.all(
            Object.entries(defaultTools).map(
                ([name, config]) => mcpManager.startServer(name, config)
            )
        );

        coordinator = new SessionCoordinator({
            metadata: {
                name: WORKSPACE_NAME,
                path: workspace.paths.root
            },
            promptManager: workspace.prompt,
            sessionManager: workspace.sessions,
            mcpManager,
            modelsManager: workspace.models,
            filesManager: workspace.files,
            dynamicContextManager: workspace.dynamic
        });
    });

    afterEach(async () => {
        await mcpManager.cleanup();
        await testDir.cleanup();
    });

    test('provides streaming updates for responses with tools', async () => {
        const session = await workspace.sessions.createSession({
            title: 'Tool Test'
        });

        // Check if we have tools available
        const tools = await mcpManager.listAllTools();
        if (tools.length === 0) {
            console.log('No tools available, skipping tool test');
            return;
        }

        // This prompt should trigger tool calls for filesystem operations
        const { completionPromise } = await coordinator.handleRequest(
            session.id,
            'Please create a file called test.txt with the content "Hello from Mandrake" and then read it back to confirm it was created.'
        );
        
        // Wait for the request to complete
        await completionPromise;

        // Get the session history
        const history = await workspace.sessions.renderSessionHistory(session.id);
        expect(history.rounds).toHaveLength(1);

        // Get the response turns
        const response = history.rounds[0].response;
        const turns = response.turns;

        // Should have multiple turns when using tools
        expect(turns.length).toBeGreaterThanOrEqual(1);

        // Check for tool calls in the turns
        const turnsWithToolCalls = turns.filter(turn => {
            try {
                const toolCallsStr = turn.toolCalls;
                if (!toolCallsStr || toolCallsStr === '[]' || toolCallsStr === '{}') {
                    return false;
                }
                const parsed = JSON.parse(toolCallsStr);
                
                // Check if it's a valid tool call structure
                if (parsed && parsed.call) {
                    return true;
                }
                
                return parsed &&
                    (Object.keys(parsed).length > 0 ||
                        (Array.isArray(parsed) && parsed.length > 0));
            } catch (e) {
                return false;
            }
        });

        // Should have at least one turn with tool calls
        expect(turnsWithToolCalls.length).toBeGreaterThan(0);

        // The final turn should have content confirming the operation
        const finalTurn = turns[turns.length - 1];
        expect(finalTurn.content).toBeTruthy();
        expect(finalTurn.content.toLowerCase()).toMatch(/hello from mandrake|created|confirmed|successfully/i);
    }, 60000);
});