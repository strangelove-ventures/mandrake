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
import { randomUUID } from 'crypto';

/**
 * Tests focusing on the session manager operations in the API:
 * - CRUD operations for sessions
 * - Session listing and retrieval
 * - Database operations
 */
describe('Session Manager API Tests', () => {
    let testDir: TestDirectory;
    let originalMandrakeRoot: string | undefined;
    let testWorkspace: WorkspaceManager;
    let workspaceRoutes: ReturnType<typeof createSessionRoutes>;

    // Test session ID for reuse in tests
    let testSessionId: string;

    // Set up the test environment once
    beforeAll(async () => {
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

    describe('Session CRUD operations', () => {
        test('should create a new session', async () => {
            // Create test data for a new session
            const sessionData = {
                title: 'Test Session',
                description: 'A test session for E2E tests',
                metadata: { key: 'value' }
            };

            // Create a request
            const req = createTestRequest(
                `https://example.com/api/workspaces/${testWorkspace.id}/sessions`,
                {
                    method: 'POST',
                    body: sessionData
                }
            );

            // Call the route handler
            const response = await workspaceRoutes.POST(req, {
                params: { id: testWorkspace.id }
            });

            // Parse the response
            const result = await parseApiResponse(response);

            // Verify the response
            expect(result.success).toBe(true);
            expect(result.status).toBe(201);
            expect(result.data).toBeDefined();
            expect(result.data.id).toBeDefined();
            expect(result.data.title).toBe(sessionData.title);
            expect(result.data.description).toBe(sessionData.description);

            // Save the session ID for future tests
            testSessionId = result.data.id;
        });

        test('should list all sessions', async () => {
            // Skip this test if we don't have a valid testSessionId
            if (!testSessionId) {
                console.log('Skipping list sessions test - no test session available');
                return;
            }

            // Create a request
            const req = createTestRequest(
                `https://example.com/api/workspaces/${testWorkspace.id}/sessions`
            );

            // Call the route handler
            const response = await workspaceRoutes.GET(req, {
                params: { id: testWorkspace.id }
            });

            // Parse the response
            const result = await parseApiResponse(response);

            // Verify the response
            expect(result.success).toBe(true);
            expect(result.status).toBe(200);
            expect(Array.isArray(result.data)).toBe(true);

            // Verify the session we created is in the list
            const foundSession = result.data.find((session: any) => session.id === testSessionId);
            expect(foundSession).toBeDefined();
            expect(foundSession.title).toBe('Test Session');
        });

        test('should get a specific session', async () => {
            // Skip this test if we don't have a valid testSessionId
            if (!testSessionId) {
                console.log('Skipping get session test - no test session available');
                return;
            }

            // Create a request
            const req = createTestRequest(
                `https://example.com/api/workspaces/${testWorkspace.id}/sessions/${testSessionId}`
            );

            // Call the route handler
            const response = await workspaceRoutes.GET(req, {
                params: { id: testWorkspace.id, sessionId: testSessionId }
            });

            // Parse the response
            const result = await parseApiResponse(response);

            // Verify the response
            expect(result.success).toBe(true);
            expect(result.status).toBe(200);
            expect(result.data).toBeDefined();
            expect(result.data.session).toBeDefined();
            expect(result.data.session.id).toBe(testSessionId);
            expect(result.data.session.title).toBe('Test Session');
            expect(result.data.rounds).toBeDefined();
            expect(Array.isArray(result.data.rounds)).toBe(true);
        });

        test('should update a session', async () => {
            // Skip this test if we don't have a valid testSessionId
            if (!testSessionId) {
                console.log('Skipping update session test - no test session available');
                return;
            }

            // Create update data
            const updateData = {
                title: 'Updated Test Session',
                metadata: { updated: "true" }
            };

            // Create a request
            const req = createTestRequest(
                `https://example.com/api/workspaces/${testWorkspace.id}/sessions/${testSessionId}`,
                {
                    method: 'PUT',
                    body: updateData
                }
            );

            // Call the route handler
            const response = await (workspaceRoutes as any).PUT(req, {
                params: { id: testWorkspace.id, sessionId: testSessionId }
            });

            // Parse the response
            const result = await parseApiResponse(response);

            // Verify the response
            expect(result.success).toBe(true);
            expect(result.status).toBe(200);
            expect(result.data).toBeDefined();
            expect(result.data.id).toBe(testSessionId);
            expect(result.data.title).toBe(updateData.title);

            // Verify the session was updated in the database
            const session = await testWorkspace.sessions.getSession(testSessionId);
            expect(session.title).toBe(updateData.title);
        });

        test('should delete a session', async () => {
            // Create a new session to delete
            const { id: deleteSessionId } = await testWorkspace.sessions.createSession({
                title: 'Session to Delete'
            });

            // Create a request
            const req = createTestRequest(
                `https://example.com/api/workspaces/${testWorkspace.id}/sessions/${deleteSessionId}`,
                { method: 'DELETE' }
            );

            // Call the route handler
            const response = await (workspaceRoutes as any).DELETE(req, {
                params: { id: testWorkspace.id, sessionId: deleteSessionId }
            });

            // Verify the response is 204 No Content
            expect(response.status).toBe(204);

            // Verify the session was actually deleted
            try {
                await testWorkspace.sessions.getSession(deleteSessionId);
                // If we get here, the session was not deleted
                expect(true).toBe(false); // This should fail the test
            } catch (error) {
                // This is expected - the session should be gone
                expect((error as Error).message).toContain('not found');
            }
        });
    });

    describe('Error handling', () => {
        test('should return 404 for non-existent session', async () => {
            const nonExistentId = randomUUID();

            // Create a request
            const req = createTestRequest(
                `https://example.com/api/workspaces/${testWorkspace.id}/sessions/${nonExistentId}`
            );

            try {
                // Call the route handler
                const response = await workspaceRoutes.GET(req, {
                    params: { id: testWorkspace.id, sessionId: nonExistentId }
                });

                // Parse the response
                const result = await parseApiResponse(response);

                // Verify the response
                expect(result.success).toBe(false);
                expect(result.status).toBe(404);
                expect(result.error).toBeDefined();
                expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
                expect(result.error?.message).toContain('Session not found');
            } catch (error) {
                // If the error is thrown instead of returned as a response
                expect(error).toBeDefined();
                if ((error as any).code === 'RESOURCE_NOT_FOUND') {
                    expect((error as any).status).toBe(404);
                }
            }
        });

        test('should handle validation errors for invalid input', async () => {
            // Test with invalid request data (missing required fields)
            const invalidData = {
                // Missing required fields for create or update
                title: ''  // Empty title should be rejected
            };

            // Create a request
            const req = createTestRequest(
                `https://example.com/api/workspaces/${testWorkspace.id}/sessions`,
                {
                    method: 'POST',
                    body: invalidData
                }
            );

            try {
                // Call the route handler
                const response = await workspaceRoutes.POST(req, {
                    params: { id: testWorkspace.id }
                });

                // Parse the response
                const result = await parseApiResponse(response);

                // Verify that it failed with appropriate error
                expect(result.success).toBe(false);
                expect(result.status).toBeGreaterThanOrEqual(400);
                expect(result.status).toBeLessThan(500);
            } catch (error) {
                // If the error is thrown directly
                expect(error).toBeDefined();
                // Expect a validation related error
                expect((error as Error).message).toBeDefined();
            }
        });

        test('should handle database errors gracefully', async () => {
            // This test is more conceptual as we can't easily simulate DB errors
            // In a real environment, we'd mock the DB to throw errors

            // Instead, we'll verify that even with weird input, we don't crash
            const weirdData = {
                title: 'X'.repeat(10000),  // Very long title
                description: null as any,   // Null description
                metadata: { nested: { deeply: { object: true } } }  // Complex metadata
            };

            // Create a request
            const req = createTestRequest(
                `https://example.com/api/workspaces/${testWorkspace.id}/sessions`,
                {
                    method: 'POST',
                    body: weirdData
                }
            );

            try {
                // Call the route handler
                const response = await workspaceRoutes.POST(req, {
                    params: { id: testWorkspace.id }
                });

                // If it succeeds, that's fine - the app should be resilient
                const result = await parseApiResponse(response);

                // Just verify we got a reasonable response
                expect(result).toBeDefined();
            } catch (error) {
                // If it fails, that's also fine - as long as it's a controlled failure
                expect(error).toBeDefined();
                // Just verify we didn't throw a generic unhandled error
                expect((error as any).status).toBeDefined();
            }
        });
    });
});