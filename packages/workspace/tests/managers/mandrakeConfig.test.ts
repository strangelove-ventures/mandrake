import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { MandrakeConfigManager } from '../../src/managers/mandrakeConfig';
import { createTestDirectory, type TestDirectory } from '../utils/utils';
import type { MandrakeConfig } from "../../dist";

describe('MandrakeConfigManager', () => {
    let testDir: TestDirectory;
    let configManager: MandrakeConfigManager;

    beforeEach(async () => {
        testDir = await createTestDirectory('mandrake-config-test-');
        const configPath = join(testDir.path, 'mandrake.json');
        configManager = new MandrakeConfigManager(configPath);
    });

    afterEach(async () => {
        await testDir.cleanup();
    });

    describe('Initialization', () => {
        test('should create config file when initialized', async () => {
            await configManager.init();

            const exists = await configManager.exists();
            expect(exists).toBe(true);
        });

        test('should create config with correct default values', async () => {
            await configManager.init();

            const config = await configManager.getConfig();
            expect(config.theme).toBe('system');
            expect(config.telemetry).toBe(true);
            expect(config.metadata).toEqual({});
            expect(config.workspaces).toEqual([]);
        });

        test('should be idempotent when calling init multiple times', async () => {
            // First init
            await configManager.init();

            // Modify config to test idempotency
            await configManager.updateConfig({ theme: 'dark' });

            // Second init (should not reset to defaults)
            await configManager.init();
            const config = await configManager.getConfig();

            expect(config.theme).toBe('dark');
        });
    });

    describe('Configuration Operations', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        test('should get config values', async () => {
            const config = await configManager.getConfig();
            expect(config.theme).toBe('system');
            expect(config.telemetry).toBe(true);
            expect(config.workspaces).toEqual([]);
        });

        test('should update config values', async () => {
            const updates = {
                theme: 'dark',
                telemetry: false,
                metadata: { version: '1.0.0' }
            };

            await configManager.updateConfig(updates as MandrakeConfig);
            const updatedConfig = await configManager.getConfig();

            expect(updatedConfig.theme).toBe(updates.theme as 'dark' | 'light' | 'system');
            expect(updatedConfig.telemetry).toBe(updates.telemetry);
            expect(updatedConfig.metadata).toEqual(updates.metadata);
        });
    });

    describe('Workspace Management', () => {
        beforeEach(async () => {
            await configManager.init();
        });

        test('should register a workspace', async () => {
            const workspace = {
                id: crypto.randomUUID(),
                name: 'test-workspace',
                path: '/path/to/workspace',
                description: 'Test workspace description'
            };

            await configManager.registerWorkspace(workspace);

            const config = await configManager.getConfig();
            expect(config.workspaces).toHaveLength(1);

            const registered = (config.workspaces as any)[0];
            expect(registered.id).toBe(workspace.id);
            expect(registered.name).toBe(workspace.name);
            expect(registered.path).toBe(workspace.path);
            expect(registered.description).toBe(workspace.description);
            expect(registered.lastOpened).toBeDefined();
        });

        test('should find workspace by ID', async () => {
            const workspace = {
                id: 'workspace-123',
                name: 'test-workspace',
                path: '/path/to/workspace'
            };

            await configManager.registerWorkspace(workspace);

            const found = await configManager.findWorkspaceById(workspace.id);
            expect(found).toBeDefined();
            expect(found?.id).toBe(workspace.id);
            expect(found?.name).toBe(workspace.name);
        });

        test('should find workspace by name', async () => {
            const workspace = {
                id: 'workspace-123',
                name: 'test-workspace',
                path: '/path/to/workspace'
            };

            await configManager.registerWorkspace(workspace);

            const found = await configManager.findWorkspaceByName(workspace.name);
            expect(found).toBeDefined();
            expect(found?.id).toBe(workspace.id);
            expect(found?.name).toBe(workspace.name);
        });

        test('should update workspace timestamp', async () => {
            const workspace = {
                id: 'workspace-123',
                name: 'test-workspace',
                path: '/path/to/workspace',
                lastOpened: '2020-01-01T00:00:00.000Z'
            };

            await configManager.registerWorkspace(workspace);

            // Update timestamp
            const success = await configManager.updateWorkspaceTimestamp(workspace.id);
            expect(success).toBe(true);

            // Get the updated workspace
            const found = await configManager.findWorkspaceById(workspace.id);
            expect(found?.lastOpened).not.toBe(workspace.lastOpened);
            expect(new Date(found?.lastOpened || '')).toBeInstanceOf(Date);
        });

        test('should unregister workspace', async () => {
            const workspace = {
                id: 'workspace-123',
                name: 'test-workspace',
                path: '/path/to/workspace'
            };

            await configManager.registerWorkspace(workspace);

            // Verify it's registered
            let config = await configManager.getConfig();
            expect(config.workspaces).toHaveLength(1);

            // Unregister
            const unregistered = await configManager.unregisterWorkspaceById(workspace.id);
            expect(unregistered).toBeDefined();
            expect(unregistered?.id).toBe(workspace.id);

            // Verify it's gone
            config = await configManager.getConfig();
            expect(config.workspaces).toHaveLength(0);
        });

        test('should list workspaces', async () => {
            // Create test workspaces with valid UUIDs
            const workspaces = [
                {
                    id: crypto.randomUUID(),
                    name: 'workspace-1',
                    path: '/path/to/workspace-1'
                },
                {
                    id: crypto.randomUUID(),
                    name: 'workspace-2',
                    path: '/path/to/workspace-2'
                }
            ];

            for (const workspace of workspaces) {
                await configManager.registerWorkspace(workspace);
            }

            const listed = await configManager.listWorkspaces();
            expect(listed).toHaveLength(2);

            // Check names instead of IDs
            expect(listed.map(w => w.name)).toContain('workspace-1');
            expect(listed.map(w => w.name)).toContain('workspace-2');

            // Verify that the IDs are valid UUIDs
            const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            listed.forEach(workspace => {
                expect(uuid_regex.test(workspace.id)).toBe(true);
            });
        });
    });

    describe('Error Handling', () => {
        test('should throw error when reading non-existent config', async () => {
            // Don't initialize first
            await expect(configManager.getConfig()).rejects.toThrow();
        });

        test('should handle corrupted config', async () => {
            await configManager.init();

            // Corrupt the config file
            const configPath = join(testDir.path, 'mandrake.json');
            await Bun.write(configPath, 'invalid json');

            // Should fail to read corrupted config
            await expect(configManager.getConfig()).rejects.toThrow();

            // Re-initialization should repair the corrupted file
            await configManager.init();
            const config = await configManager.getConfig();
            expect(config.theme).toBe('system');
        });
    });
});