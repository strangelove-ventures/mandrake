import { describe, test, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager, type ServerConfig } from '@mandrake/mcp';
import { SessionCoordinator } from '../../src/coordinator';
import { createTestDirectory, type TestDirectory } from '../utils/testdir';
import type { WorkspacePaths } from '@mandrake/workspace';
import { config } from 'dotenv';
import { resolve } from 'path';

function getServerConfigs(paths: WorkspacePaths): Record<string, ServerConfig> {
    return {
        ripper: {
            command: 'bun',
            args: [
                'run',
                '../ripper/dist/server.js',
                '--transport=stdio',
                `--workspaceDir=${paths.root}`,
                '--excludePatterns=\\.ws'
            ]
        }
    };
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
        const configs = getServerConfigs(workspace.paths);
        await Promise.all(
            Object.entries(configs).map(
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

    test('provides streaming updates for responses', async () => {
        const session = await workspace.sessions.createSession({
            title: 'Local Command Test'
        });

        // This prompt should trigger multiple tool calls
        const { completionPromise } = await coordinator.handleRequest(
            session.id,
            'Can you run the "hostname" command to get the system name, then run "pwd" to get the current directory, save both outputs to a file called "system_info.txt" in our workspace, and then confirm the file was created?'
        );
        
        // Wait for the request to complete
        await completionPromise;

        // Get the session history
        const history = await workspace.sessions.renderSessionHistory(session.id);
        expect(history.rounds).toHaveLength(1);

        // Get the response turns
        const response = history.rounds[0].response;
        const turns = response.turns;

        console.log(turns)
        // We should have multiple turns
        expect(turns.length).toBeGreaterThan(1);

        // At least one turn should have non-empty toolCalls
        const turnsWithToolCalls = turns.filter(turn => {
            try {
                // Check if toolCalls is present and not empty
                const toolCallsStr = turn.toolCalls;

                // Ensure it's a valid JSON string
                if (!toolCallsStr || toolCallsStr === '[]') {
                    return false;
                }

                // Try to parse it
                const parsed = JSON.parse(toolCallsStr);

                // Consider it valid if it has some data
                return parsed &&
                    (Object.keys(parsed).length > 0 ||
                        (Array.isArray(parsed) && parsed.length > 0));
            } catch (e) {
                return false;
            }
        });

        expect(turnsWithToolCalls.length).toBeGreaterThan(0);

        // The final turn should have content but might not have tool calls
        const finalTurn = turns[turns.length - 1];
        expect(finalTurn.content).toBeTruthy();
    }, 480000);
});