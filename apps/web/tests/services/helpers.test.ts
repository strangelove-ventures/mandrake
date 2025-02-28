/**
 * Tests for service helpers
 */
import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import {
    getSessionCoordinatorForRequest,
    getWorkspaceManagerForRequest,
    getMCPManagerForRequest,
    releaseSessionResources,
    releaseWorkspaceResources,
    triggerResourceCleanup
} from '../../src/lib/services/helpers';
import { getServiceRegistry, resetServiceRegistryForTesting } from '../../src/lib/services/registry';
import { createTestDirectory } from '../utils/test-dir';
import { WorkspaceManager } from '@mandrake/workspace';
import { MCPManager } from '@mandrake/mcp';
import { SessionCoordinator } from '@mandrake/session';
import { randomUUID } from 'crypto';

describe('Service Helpers', () => {
    // Global timeout constants
    const MCP_TEST_TIMEOUT = 30_000;
    const SESSION_TEST_TIMEOUT = 30_000;

    // Test directory
    let testDir: { path: string; cleanup: () => Promise<void> };
    const originalMandrakeRoot = process.env.MANDRAKE_ROOT;
    
    beforeEach(async () => {
        testDir = await createTestDirectory();
        process.env.MANDRAKE_ROOT = testDir.path;
        console.log(`Using test directory: ${testDir.path}`);
        resetServiceRegistryForTesting();

        const registry = getServiceRegistry();
        await registry.getMandrakeManager();
        console.log('MandrakeManager initialized successfully');
    });
    
    afterEach(async () => {
        try {
            const registry = getServiceRegistry();
            await registry.performCleanup();
        } catch (error) {
            console.warn('Error during cleanup', error);
        }
        
        process.env.MANDRAKE_ROOT = originalMandrakeRoot;
        await testDir.cleanup();
    });

    describe('getWorkspaceManagerForRequest', () => {
        test('should return a workspace manager', async () => {
            // Create a workspace manually first
            const registry = getServiceRegistry();
            const mandrake = await registry.getMandrakeManager();
            const workspace = await mandrake.createWorkspace(`ws-${randomUUID().slice(0, 8)}`);
            const workspaceId = workspace.id;

            // Now test the helper
            const manager = await getWorkspaceManagerForRequest(workspaceId);

            expect(manager).toBeDefined();
            expect(manager.id).toBe(workspaceId);
        });

        test('should return the same workspace manager for the same workspace', async () => {
            // Create a workspace manually first
            const registry = getServiceRegistry();
            const mandrake = await registry.getMandrakeManager();
            const workspace = await mandrake.createWorkspace(`ws-${randomUUID().slice(0, 8)}`);
            const workspaceId = workspace.id;

            // Get the workspace manager twice
            const manager1 = await getWorkspaceManagerForRequest(workspaceId);
            const manager2 = await getWorkspaceManagerForRequest(workspaceId);

            expect(manager2.name).toBe(manager1.name);
            expect(manager1.id).toBe(workspaceId);
        });

        test('should throw an error if workspace does not exist', async () => {
            const nonExistentId = `ws-${randomUUID()}`;

            // Expect the helper to throw an error
            let error: Error | null = null;
            try {
                await getWorkspaceManagerForRequest(nonExistentId);
            } catch (e) {
                error = e as Error;
            }

            expect(error).not.toBeNull();
            expect(error?.message).toContain('Workspace with ID');
        });
    });
    describe('getMCPManagerForRequest', () => {
        test('should return an MCP manager', async () => {
            // Create a workspace manually first
            const registry = getServiceRegistry();
            const mandrake = await registry.getMandrakeManager();
            const workspace = await mandrake.createWorkspace(`ws-${randomUUID().slice(0, 8)}`);
            const workspaceId = workspace.id;

            // Get the MCP manager
            const mcpManager = await getMCPManagerForRequest(workspaceId);

            expect(mcpManager).toBeDefined();
            expect(mcpManager).toBeInstanceOf(MCPManager);
        }, MCP_TEST_TIMEOUT);

        test('should throw an error if workspace does not exist', async () => {
            const nonExistentId = `ws-${randomUUID()}`;

            // Expect the helper to throw an error
            let error: Error | null = null;
            try {
                await getMCPManagerForRequest(nonExistentId);
            } catch (e) {
                error = e as Error;
            }

            expect(error).not.toBeNull();
            expect(error?.message).toContain('not found');
        }, MCP_TEST_TIMEOUT);
    });

    describe('getSessionCoordinatorForRequest', () => {
        test('should return a session coordinator', async () => {
            // Create a workspace manually first
            const registry = getServiceRegistry();
            const mandrake = await registry.getMandrakeManager();
            const workspace = await mandrake.createWorkspace(`ws-${randomUUID().slice(0, 8)}`);
            const workspaceId = workspace.id;
            const sessionId = `session-${randomUUID().slice(0, 8)}`;

            // Get the session coordinator
            const coordinator = await getSessionCoordinatorForRequest(workspaceId, sessionId);

            expect(coordinator).toBeDefined();
            expect(coordinator).toBeInstanceOf(SessionCoordinator);
        }, SESSION_TEST_TIMEOUT);

        test('should return the same coordinator for the same session', async () => {
            // Create a workspace manually first
            const registry = getServiceRegistry();
            const mandrake = await registry.getMandrakeManager();
            const workspace = await mandrake.createWorkspace(`ws-${randomUUID().slice(0, 8)}`);
            const workspaceId = workspace.id;
            const sessionId = `session-${randomUUID().slice(0, 8)}`;

            // Get the session coordinator twice
            const coordinator1 = await getSessionCoordinatorForRequest(workspaceId, sessionId);
            const coordinator2 = await getSessionCoordinatorForRequest(workspaceId, sessionId);

            expect(coordinator2).toBe(coordinator1);
        }, SESSION_TEST_TIMEOUT);

        test('should throw an error if workspace does not exist', async () => {
            const nonExistentId = `ws-${randomUUID()}`;
            const sessionId = `session-${randomUUID().slice(0, 8)}`;

            // Expect the helper to throw an error
            let error: Error | null = null;
            try {
                await getSessionCoordinatorForRequest(nonExistentId, sessionId);
            } catch (e) {
                error = e as Error;
            }

            expect(error).not.toBeNull();
            expect(error?.message).toContain('not found');
        }, SESSION_TEST_TIMEOUT);
    });

    describe('releaseSessionResources', () => {
        test('should clean up a session', async () => {
            // Create a workspace manually first
            const registry = getServiceRegistry();
            const mandrake = await registry.getMandrakeManager();
            const workspace = await mandrake.createWorkspace(`ws-${randomUUID().slice(0, 8)}`);
            const workspaceId = workspace.id;
            const sessionId = `session-${randomUUID().slice(0, 8)}`;

            // Get the session coordinator
            const coordinator = await getSessionCoordinatorForRequest(workspaceId, sessionId);

            // Create a spy to check cleanup is called
            const originalCleanup = coordinator.cleanup;
            let cleanupCalled = false;
            coordinator.cleanup = async function () {
                cleanupCalled = true;
                return originalCleanup.call(this);
            };

            // Release the session
            await releaseSessionResources(workspaceId, sessionId);

            // Verify cleanup was called
            expect(cleanupCalled).toBe(true);

            // Reset the spy
            coordinator.cleanup = originalCleanup;
        }, SESSION_TEST_TIMEOUT);

        test('should do nothing if session does not exist', async () => {
            // Just verify no error is thrown
            await releaseSessionResources('non-existent', 'non-existent');

            // This test passes if no error is thrown
            expect(true).toBe(true);
        });
    });

    describe('triggerResourceCleanup', () => {
        test('should trigger cleanup of inactive resources', async () => {
            const registry = getServiceRegistry();

            // Create a spy on performCleanup
            const originalPerformCleanup = registry.performCleanup;
            let performCleanupCalled = false;

            registry.performCleanup = async function () {
                performCleanupCalled = true;
                return originalPerformCleanup.call(this);
            };

            // Trigger cleanup
            await triggerResourceCleanup();

            // Verify performCleanup was called
            expect(performCleanupCalled).toBe(true);

            // Reset the spy
            registry.performCleanup = originalPerformCleanup;
        });
    });
});