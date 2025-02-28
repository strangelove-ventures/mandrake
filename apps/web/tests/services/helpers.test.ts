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
import { getServiceRegistry } from '../../src/lib/services/registry';
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
        try {
            Object.keys(require.cache).forEach(key => {
                if (key.includes('mandrake-new')) {
                    delete require.cache[key];
                }
            });
        } catch (error) {
            console.warn('Could not reset modules', error);
        }
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

            expect(manager2).toBe(manager1);
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
            expect(error?.message).toContain('Config file not found');
        });
    });
});