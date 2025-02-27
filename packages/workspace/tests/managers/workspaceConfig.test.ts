import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { join } from 'path';
import { WorkspaceConfigManager } from '../../src/managers/workspaceConfig';
import { createTestDirectory, type TestDirectory } from '../utils/utils';
import { workspaceSchema } from '../../src'

describe('WorkspaceConfigManager', () => {
    let testDir: TestDirectory;
    let configManager: WorkspaceConfigManager;
    const workspaceName = 'test-workspace';
    const workspaceId = crypto.randomUUID();

    beforeEach(async () => {
        testDir = await createTestDirectory('workspace-config-test-');
        const configPath = join(testDir.path, 'workspace.json');
        configManager = new WorkspaceConfigManager(configPath, workspaceId, workspaceName);
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
            const description = 'Test workspace description';
            await configManager.init(description);

            const config = await configManager.getConfig();
            expect(config.id).toBe(workspaceId);
            expect(config.name).toBe(workspaceName);
            expect(config.description).toBe(description);
            expect(config.created).toBeDefined();
            expect(new Date(config.created)).toBeInstanceOf(Date);
            expect(config.metadata).toEqual({});
        });

        test('should be idempotent when calling init multiple times', async () => {
            // First init with description
            await configManager.init('First description');
            const firstConfig = await configManager.getConfig();

            // Second init with different description (should not change)
            await configManager.init('Second description');
            const secondConfig = await configManager.getConfig();

            expect(secondConfig.description).toBe(firstConfig.description as string);
            expect(secondConfig.created).toBe(firstConfig.created);
        });
    });

    describe('Configuration Operations', () => {
        beforeEach(async () => {
            await configManager.init('Initial description');
        });

        test('should get config values', async () => {
            const config = await configManager.getConfig();
            expect(config.id).toBe(workspaceId);
            expect(config.name).toBe(workspaceName);
            expect(config.metadata).toEqual({});
        });

        test('should update config values', async () => {
            const updates = {
                description: 'Updated description',
                metadata: { key: 'value' }
            };

            await configManager.updateConfig(updates);
            const updatedConfig = await configManager.getConfig();

            expect(updatedConfig.description).toBe(updates.description);
            expect(updatedConfig.metadata).toEqual(updates.metadata);
            // ID and name should not change
            expect(updatedConfig.id).toBe(workspaceId);
            expect(updatedConfig.name).toBe(workspaceName);
        });

        test('should enforce ID consistency', async () => {
            // Update with a different ID (should be rejected)
            await expect(configManager.updateConfig({ id: 'different-id' })).rejects.toThrow();

            // Config ID should remain unchanged
            const config = await configManager.getConfig();
            expect(config.id).toBe(workspaceId);
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
            const configPath = join(testDir.path, 'workspace.json');
            await Bun.write(configPath, 'invalid json');

            // Should fail to read corrupted config
            await expect(configManager.getConfig()).rejects.toThrow();

            // Re-initialization should repair the corrupted file
            await configManager.init();
            const config = await configManager.getConfig();
            expect(config.id).toBe(workspaceId);
        });
    });
});