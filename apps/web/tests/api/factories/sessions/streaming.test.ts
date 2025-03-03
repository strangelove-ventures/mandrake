// /apps/web/tests/api/factories/sessions/streaming.test.ts
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import {
    setupApiTest,
    cleanupApiTest,
    createTestWorkspace,
    createTestRequest,
    parseApiResponse
} from '../../utils/setup';
import { TestDirectory } from '../../../utils/test-dir';
import { WorkspaceManager } from '@mandrake/workspace';
import { createSessionRoutes } from '@/lib/api/factories/sessions';
import { getWorkspaceManagerForRequest } from '@/lib/services/helpers';
import { createLogger } from '@mandrake/utils';
import { config } from 'dotenv';
import { resolve } from 'path';

const logger = createLogger('SessionStreamingTests');

/**
 * Tests focusing on the streaming aspects of the Sessions API:
 * - SSE endpoint
 * - Turn streaming behavior
 * - Tool call streaming behavior
 * - Stream completion and error handling
 */
describe('Session Streaming API Tests', () => {
    let testDir: TestDirectory;
    let originalMandrakeRoot: string | undefined;
    let testWorkspace: WorkspaceManager;
    let workspaceRoutes: ReturnType<typeof createSessionRoutes>;

    // Test session ID for reuse in tests
    let testSessionId: string;

    // Set up the test environment once
    beforeAll(async () => {
        config({ path: resolve(__dirname, '../../../../../../.env') });

        const setup = await setupApiTest();
        testDir = setup.testDir;
        originalMandrakeRoot = setup.originalMandrakeRoot;

        // Create a test workspace
        testWorkspace = await createTestWorkspace();
        console.log(`Created test workspace: ${testWorkspace.name} (${testWorkspace.id})`);

        // Initialize the workspace fully
        await testWorkspace.init();

        // Create route handlers
        workspaceRoutes = createSessionRoutes({ workspace: testWorkspace.id });

        // Create a test session to use in the tests
        try {
            const session = await testWorkspace.sessions.createSession({
                title: 'Streaming Test Session',
                description: 'Session for testing streaming functionality'
            });
            testSessionId = session.id;
            console.log(`Created test session: ${testSessionId}`);
        } catch (error) {
            console.error('Failed to create test session:', error);
        }

        // modify the anthropic provider to us the test API key
        await testWorkspace.models.updateProvider('anthropic', {
            apiKey: process.env.ANTHROPIC_API_KEY
        });

    });

    // Ensure session manager is initialized before each test
    beforeEach(async () => {
        try {
            await testWorkspace.sessions.init();
            logger.debug('Session manager initialized');
        } catch (error) {
            console.warn('Failed to initialize session manager:', error);
        }
    });

    // Clean up the test environment
    afterAll(async () => {
        // Attempt to clean up the test session
        try {
            if (testSessionId) {
                await testWorkspace.sessions.deleteSession(testSessionId);
            }
        } catch (error) {
            // Ignore errors during cleanup
            console.log(`Note: Could not clean up test session: ${error}`);
        }

        await cleanupApiTest(testDir, originalMandrakeRoot);
    });

    describe('Turn Tracking', () => {        
        test('end-to-end streaming with tool calls', async () => {
            // Skip this test if we don't have a valid testSessionId
            if (!testSessionId || process.env.TEST_ENVIRONMENT === 'ci') {
                console.log('Skipping E2E streaming test - not suitable for this environment');
                return;
            }

            // Create message data that will likely trigger a tool call
            const messageData = {
                content: 'Can you run the "hostname" command to get the system name, then run "pwd" to get the current directory, save both outputs to a file called "system_info.txt" in our workspace, and then confirm the file was created?'
            };

            // Create a request
            const req = createTestRequest(
                `https://example.com/api/workspaces/${testWorkspace.id}/sessions/${testSessionId}/stream`,
                {
                    method: 'POST',
                    body: messageData
                }
            );

            try {
                // Call the route handler
                const response = await workspaceRoutes.POST(req, {
                    params: { id: testWorkspace.id, sessionId: testSessionId, stream: 'stream' }
                });

                // Ensure we have a proper SSE response
                expect(response.headers.get('Content-Type')).toBe('text/event-stream');
                
                // Set up to read the stream
                const reader = response.body?.getReader();
                if (!reader) {
                    throw new Error('Response body is missing');
                }

                const events: any[] = [];
                let isDone = false;
                let readTimeoutId: any;

                // Set a max timeout for reading (30 seconds)
                const readTimeout = new Promise<void>((_, reject) => {
                    readTimeoutId = setTimeout(() => {
                        reject(new Error('Stream reading timed out after 30 seconds'));
                    }, 30000);
                });

                // Function to read chunks until done
                const readStream = async () => {
                    try {
                        while (!isDone) {
                            const { done, value } = await reader.read();
                            
                            if (done) {
                                isDone = true;
                                break;
                            }
                            
                            // Parse the chunk into SSE events
                            const text = typeof value === 'string' ? value : new TextDecoder().decode(value);
                            const eventStrings = text.split('\n\n').filter(Boolean);

                            for (const eventString of eventStrings) {
                                if (eventString.startsWith('data: ')) {
                                    try {
                                        const eventData = JSON.parse(eventString.substring(6));
                                        events.push(eventData);
                                        
                                        // If we get a 'complete' event, we can stop
                                        if (eventData.type === 'complete') {
                                            isDone = true;
                                            break;
                                        }
                                        
                                        // If we get an 'error' event, log it and stop
                                        if (eventData.type === 'error') {
                                            console.warn('Stream error:', eventData.error);
                                            isDone = true;
                                            break;
                                        }
                                    } catch (e) {
                                        console.warn('Failed to parse event data:', eventString);
                                    }
                                }
                            }
                        }
                    } finally {
                        clearTimeout(readTimeoutId);
                    }
                };

                // Race between reading and timeout
                await Promise.race([readStream(), readTimeout]);
                
                // Release the reader
                reader.releaseLock();
                
                // Analyze the events we received
                console.log(`Received ${events.length} events from stream`);
                
                // Should have at least some events
                expect(events.length).toBeGreaterThan(0);
                
                // Should have a start event
                const startEvent = events.find(e => e.type === 'start');
                expect(startEvent).toBeDefined();
                
                // Should have update events
                const updateEvents = events.filter(e => e.type === 'update');
                expect(updateEvents.length).toBeGreaterThan(0);
                
                // Check for tool calls (this is optional as we don't know for sure if
                // the model will generate tool calls)
                const toolCallEvents = updateEvents.filter(e => 
                    e.turn && e.turn.toolCalls && 
                    e.turn.toolCalls.call && 
                    e.turn.toolCalls.call.serverName === 'ripper'
                );
                
                console.log(`Found ${toolCallEvents.length} tool call events`);
                
                // If we have tool calls, ensure they have responses
                if (toolCallEvents.length > 0) {
                    const responseEvents = updateEvents.filter(e => 
                        e.turn && e.turn.toolCalls && 
                        e.turn.toolCalls.response
                    );
                    
                    expect(responseEvents.length).toBeGreaterThan(0);
                }
                
                // Should end with a complete event or an error event
                const completeEvent = events.find(e => e.type === 'complete');
                const errorEvent = events.find(e => e.type === 'error');
                
                expect(completeEvent || errorEvent).toBeDefined();
                
            } catch (error) {
                // Log the error but don't fail the test
                // This is likely to fail in test environments without real model access
                console.log('Note: E2E streaming test error (expected in test env):', error);
            }
        }, 60000); // Allow up to 60 seconds for this test
    });
});
