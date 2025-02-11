import { describe, expect, beforeAll, afterAll, it, afterEach } from "bun:test";
import { DockerMCPService } from '../docker';
import { serverConfigs } from './configurations';
import { testLogger } from './test-utils';

describe('Multi Server Tests', () => {
    let service: DockerMCPService;

    beforeAll(async () => {
        await Promise.all(
            Object.values(serverConfigs).map(config =>
                config.hooks.beforeAll?.()
            )
        );
    });

    afterAll(async () => {
        await Promise.all(
            Object.values(serverConfigs).map(config =>
                config.hooks.afterAll?.()
            )
        );
    });

    afterEach(async () => {
        if (service) {
            await service.cleanup();
        }
        await Promise.all(
            Object.values(serverConfigs).map(config =>
                config.hooks.afterEach?.()
            )
        );
    });

    it('should validate all servers', async () => {
        service = new DockerMCPService(testLogger);
        await service.initialize(
            Object.values(serverConfigs).map(config => config.serverConfig)
        );

        for (const config of Object.values(serverConfigs)) {
            testLogger.info(`Validating ${config.id} server`);
            await config.hooks.validate?.(service);
        }
    }, { timeout: 60000 });

    it('should handle server restarts', async () => {
        // First initialization
        service = new DockerMCPService(testLogger);
        await service.initialize(
            Object.values(serverConfigs).map(config => config.serverConfig)
        );

        // Run validations
        for (const config of Object.values(serverConfigs)) {
            await config.hooks.validate?.(service);
        }

        // Cleanup
        await service.cleanup();

        // Reinitialize
        await service.initialize(
            Object.values(serverConfigs).map(config => config.serverConfig)
        );

        // Validate again
        for (const config of Object.values(serverConfigs)) {
            await config.hooks.validate?.(service);
        }
    }, { timeout: 60000 });

    it('should handle partial failures', async () => {
        service = new DockerMCPService(testLogger);

        // Add an invalid server config
        const configs = [
            ...Object.values(serverConfigs).map(config => config.serverConfig),
            {
                id: 'invalid',
                name: 'invalid',
                image: 'does-not-exist:latest',
                command: [],
                execCommand: []
            }
        ];

        // Should fail gracefully
        await expect(service.initialize(configs)).rejects.toThrow();

        // Should still work with valid configs
        await service.initialize(
            Object.values(serverConfigs).map(config => config.serverConfig)
        );

        // Valid servers should work
        for (const config of Object.values(serverConfigs)) {
            await config.hooks.validate?.(service);
        }
    }, { timeout: 60000 });

    it('should properly cleanup servers', async () => {
        // First setup and validate servers
        service = new DockerMCPService(testLogger);
        await service.initialize(
            Object.values(serverConfigs).map(config => config.serverConfig)
        );

        // Validate all servers are running
        for (const config of Object.values(serverConfigs)) {
            const server = service.getServer(config.id);
            expect(server).toBeTruthy();

            // We should be able to get container state
            if (!server) {
                continue;
            }
            const info = await server.getInfo();
            expect(info.State.Running).toBe(true);
        }

        // Cleanup
        await service.cleanup();

        // After cleanup:
        // 1. No servers should be accessible
        for (const config of Object.values(serverConfigs)) {
            const server = service.getServer(config.id);
            expect(server).toBeUndefined();
        }

        // 2. No containers should be running
        const containers = await service.docker.listContainers({
            all: true,
            filters: { label: ['mandrake.mcp.managed=true'] }
        });
        expect(containers.length).toBe(0);
    }, { timeout: 60000 });
});