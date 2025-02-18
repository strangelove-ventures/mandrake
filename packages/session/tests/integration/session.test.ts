import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { SessionCoordinator } from '../../src/coordinator';
import { AnthropicProvider } from '@mandrake/provider';
import { MCPManager } from '@mandrake/mcp';
import { createTestDirectory } from '../utils/testdir';
import type { TestDirectory } from '../utils/testdir';

describe('Session Integration', () => {
    let testDir: TestDirectory;
    let mcpManager: MCPManager;

    // Docker image references
    const IMAGES = {
        filesystem: 'mcp/filesystem',
        fetch: 'mcp/fetch'
    };

    beforeAll(async () => {
        // Setup test directory
        testDir = await createTestDirectory();

        // Initialize MCP Manager
        mcpManager = new MCPManager();

        // Start MCP servers
        await mcpManager.startServer('filesystem', {
            command: 'docker',
            args: [
                'run',
                '--rm',
                '-i',
                '--mount',
                `type=bind,src=${testDir.path},dst=/projects/tmp`,
                IMAGES.filesystem,
                '/projects'
            ]
        });

        await mcpManager.startServer('fetch', {
            command: 'docker',
            args: [
                'run',
                '--rm',
                '-i',
                IMAGES.fetch
            ]
        });
    });

    afterAll(async () => {
        await mcpManager.cleanup();
        await testDir.cleanup();
    });

    test('processes complete message flow with tool usage', async () => {
        // Create provider
        const provider = new AnthropicProvider({
            apiKey: process.env.ANTHROPIC_API_KEY!,
            modelId: 'claude-3-opus-20240229',
            modelInfo: {
                maxTokens: 4096
            }
        });

        // Initialize coordinator with real components
        const coordinator = new SessionCoordinator({
            promptManager: {
                getWorkspaceInstructions: async () => 'You are a helpful assistant.',
                getSystemPromptConfig: async () => ({
                    tools: (await mcpManager.listAllTools()).map(tool => ({
                        ...tool,
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    })),
                    includeWorkspaceMetadata: true,
                    includeSystemInfo: true,
                    includeDateTime: true
                })
            },
            sessionManager: {
                getSession: async (id) => ({ 
                    id, 
                    rounds: [] 
                }),
                updateSession: async () => {}
            },
            mcpManager,
            modelsManager: {
                handleMessage: async ({ context, request }) => {
                    // Use real provider
                    const response = await provider.createMessage(
                        context.systemPrompt,
                        [{
                            role: 'user',
                            content: request
                        }]
                    );

                    // Process response chunks
                    const content: string[] = [];
                    for await (const chunk of response) {
                        if (chunk.type === 'text') {
                            content.push(chunk.text);
                        }
                    }

                    return {
                        content: content.join('')
                    };
                }
            }
        });

        // Create a test file in our workspace
        await Bun.write(
            `${testDir.path}/test.txt`,
            'Hello, World!'
        );

        // Send a message that will trigger file reading
        await coordinator.handleMessage({
            sessionId: 'test-session',
            request: 'What is in test.txt?'
        });

        // Verify file exists
        const fileExists = await Bun.file(`${testDir.path}/test.txt`).exists();
        expect(fileExists).toBe(true);
    });

    test('handles fetch tool usage', async () => {
        // Create provider
        const provider = new AnthropicProvider({
            apiKey: process.env.ANTHROPIC_API_KEY!,
            modelId: 'claude-3-opus-20240229',
            modelInfo: {
                maxTokens: 4096
            }
        });

        // Initialize coordinator 
        const coordinator = new SessionCoordinator({
            promptManager: {
                getWorkspaceInstructions: async () => 'You are a helpful assistant.',
                getSystemPromptConfig: async () => ({
                    tools: (await mcpManager.listAllTools()).map(tool => ({
                        ...tool,
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    })),
                    includeWorkspaceMetadata: true,
                    includeSystemInfo: true,
                    includeDateTime: true
                })
            },
            sessionManager: {
                getSession: async (id) => ({ 
                    id, 
                    rounds: [] 
                }),
                updateSession: async () => {}
            },
            mcpManager,
            modelsManager: {
                handleMessage: async ({ context, request }) => {
                    const response = await provider.createMessage(
                        context.systemPrompt,
                        [{
                            role: 'user',
                            content: request
                        }]
                    );

                    const content: string[] = [];
                    for await (const chunk of response) {
                        if (chunk.type === 'text') {
                            content.push(chunk.text);
                        }
                    }

                    return {
                        content: content.join('')
                    };
                }
            }
        });

        // Send a message that will trigger fetch
        await coordinator.handleMessage({
            sessionId: 'test-session',
            request: 'Fetch the page at https://example.com'
        });
    });
});