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
        // Use ripper instead of filesystem
        ripper: {
            command: 'bun',
            args: [
                'run',
                '../ripper/dist/server.js',
                '--transport=stdio',
                `--workspaceDir=${paths.root}`,
                '--excludePatterns=\\.ws'
            ]
        },
        fetch: {
            command: 'docker',
            args: [
                'run',
                '--rm',
                '-i',
                'mcp/fetch'
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

        workspace = new WorkspaceManager(testDir.path, WORKSPACE_NAME);
        await workspace.init('Test Workspace');

        await workspace.models.updateProvider('anthropic', {
            apiKey: process.env.ANTHROPIC_API_KEY
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

    test('handles multistage tool flow with fetch and file creation', async () => {
        const session = await workspace.sessions.createSession({
            title: 'Multistage Tool Test'
        });

        // This prompt should trigger:
        // 1. A fetch tool call to get data
        // 2. A write_file tool call to save the data
        await coordinator.handleRequest(
            session.id,
            'Can you fetch the current time from http://worldtimeapi.org/api/ip and save it to a file called current_time.txt in our workspace?'
        );

        const history = await workspace.sessions.renderSessionHistory(session.id);
        expect(history.rounds).toHaveLength(1);

        const response = history.rounds[0].response;
        const turns = response.turns;

        console.log(JSON.stringify(turns, null, 2));

        // We should have at least 3 turns:
        // 1. Initial response with fetch tool call
        // 2. Turn with fetch results and write_file tool call
        // 3. Final turn with confirmation message
        expect(turns.length).toBeGreaterThanOrEqual(3);

        // Check first turn - should have fetch tool call
        const firstTurnToolCalls = JSON.parse(turns[0].toolCalls);
        expect(firstTurnToolCalls.length).toBeGreaterThan(0);
        const fetchToolCall = firstTurnToolCalls[0];
        expect(fetchToolCall.serverName).toBe('fetch');
        expect(fetchToolCall.methodName).toBe('fetch');
        expect(fetchToolCall.arguments.url).toContain('worldtimeapi.org');

        // Check second turn - should have write_file tool call
        const secondTurnToolCalls = JSON.parse(turns[1].toolCalls);
        expect(secondTurnToolCalls.length).toBeGreaterThan(0);
        const writeToolCall = secondTurnToolCalls[0].call;
        expect(writeToolCall.serverName).toBe('ripper');
        expect(writeToolCall.methodName).toBe('write_file');
        expect(writeToolCall.arguments.path).toBe('current_time.txt');

        // Final turn should contain a confirmation message
        const finalTurnContent = JSON.parse(turns[turns.length - 1].content);
        const combinedContent = finalTurnContent.join('');
        expect(combinedContent).toContain('successfully');
    }, 30000);
});