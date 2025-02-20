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
        filesystem: {
            command: 'docker',
            args: [
                'run',
                '--rm',
                '-i',
                '--mount',
                `type=bind,src=${paths.root},dst=/workspace`,
                'mcp/filesystem',
                '/workspace'
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

    test('handles basic message flow with tool calls', async () => {
        const session = await workspace.sessions.createSession({
            title: 'Test Session'
        });

        await coordinator.handleMessage(
            session.id,
            'Show me the files in this workspace'
        );

        const history = await workspace.sessions.renderSessionHistory(session.id);
        expect(history.rounds).toHaveLength(1);

        const response = history.rounds[0].response;
        const turns = response.turns;

        const toolCall = JSON.parse(turns[0].toolCalls)[0];
        expect(toolCall.serverName).toBe('filesystem');
        expect(toolCall.methodName).toBe('directory_tree');
        expect(toolCall.arguments).toEqual({ path: '.' });

        const content = JSON.parse(turns[1].content);
        expect(content[0]).toContain('config');
        expect(content[0]).toContain('src');
    });
});