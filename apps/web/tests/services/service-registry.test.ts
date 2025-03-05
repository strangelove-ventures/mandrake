/**
 * Tests for the Service Registry
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
    getServiceRegistry,
    resetServiceRegistryForTesting
} from '../../src/server/services';
import { createTestDirectory } from '../utils/test-dir';
import { randomUUID } from 'crypto';

describe('ServiceRegistry Integration Tests', () => {
    let testDir: { path: string; cleanup: () => Promise<void> };
    let originalMandrakeRoot: string | undefined;
    let workspaceId: string;
    
    beforeEach(async () => {
        // Create a test directory
        testDir = await createTestDirectory();
        originalMandrakeRoot = process.env.MANDRAKE_ROOT;
        process.env.MANDRAKE_ROOT = testDir.path;
        console.log(`Using test directory: ${testDir.path}`);
        
        // Reset service registry
        await resetServiceRegistryForTesting();

        // Create a test workspace
        const registry = getServiceRegistry();
        const mandrakeManager = await registry.getMandrakeManager();
        
        const wsName = `ws-${randomUUID().slice(0, 8)}`;
        const workspace = await mandrakeManager.createWorkspace(wsName);
        workspaceId = workspace.id;
        console.log(`Created test workspace: ${wsName} (${workspaceId})`);
    });
    
    afterEach(async () => {
        // Clean up
        await resetServiceRegistryForTesting();
        process.env.MANDRAKE_ROOT = originalMandrakeRoot;
        await testDir.cleanup();
    });

    test('should properly initialize session manager for session coordinator', async () => {
        const registry = getServiceRegistry();
        const workspaceManager = await registry.getWorkspaceManager(workspaceId);
        
        // Create a session
        await workspaceManager.sessions.init(); // Initialize manually for test
        const session = await workspaceManager.sessions.createSession({
            title: 'Test Session'
        });
        
        // Get a session coordinator
        const sessionCoordinator = await registry.getSessionCoordinator(
            workspaceId,
            workspaceManager.paths.root,
            session.id
        );
        
        // Should be able to access session manager's methods via the coordinator
        expect(sessionCoordinator).toBeDefined();
        expect(sessionCoordinator.opts.sessionManager).toBeDefined();
        
        // Test that we can get the session through the coordinator
        const sessionContext = await sessionCoordinator.buildContext(session.id);
        expect(sessionContext).toBeDefined();
        expect(sessionContext.systemPrompt).toInclude("tools");
    }, 60000);

    test('should share the same session manager instance between workspace and coordinator', async () => {
        const registry = getServiceRegistry();
        const workspaceManager = await registry.getWorkspaceManager(workspaceId);
        
        // Create a session
        await workspaceManager.sessions.init(); // Initialize manually for test
        const session = await workspaceManager.sessions.createSession({
            title: 'Test Session'
        });
        
        // Get a session coordinator
        const sessionCoordinator = await registry.getSessionCoordinator(
            workspaceId,
            workspaceManager.paths.root,
            session.id
        );
        
        // The session manager instances should be the same
        expect(sessionCoordinator.opts.sessionManager).toBe(workspaceManager.sessions);
    }, 60000);
    
    test('should initialize session manager automatically when creating session coordinator', async () => {
        const registry = getServiceRegistry();
        const workspaceManager = await registry.getWorkspaceManager(workspaceId);
        
        // Create a session first
        await workspaceManager.sessions.init();
        const session = await workspaceManager.sessions.createSession({
            title: 'Test Session'
        });
        
        // Reset initialization status for testing (internal implementation detail)
        try {
            // @ts-ignore - accessing private field for testing
            workspaceManager.sessions.initialized = false;
        } catch (e) {
            console.log('Could not reset initialization status - continuing test anyway');
        }
        
        // Should still work when getting coordinator because it re-initializes
        const sessionCoordinator = await registry.getSessionCoordinator(
            workspaceId,
            workspaceManager.paths.root,
            session.id
        );
        
        // Should be able to get session data
        const sessionContext = await sessionCoordinator.buildContext(session.id);
        expect(sessionContext).toBeDefined();
        expect(sessionContext.systemPrompt).toInclude("tools");
    }, 60000);
});
