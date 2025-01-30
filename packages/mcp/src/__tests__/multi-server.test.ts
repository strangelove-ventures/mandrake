// packages/mcp/src/docker/__tests__/multi-server.test.ts
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
    }, 60000);

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
    }, 60000);

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
    }, 60000);

    it('should report correct server status', async () => {
        service = new DockerMCPService(testLogger);
        await service.initialize(
            Object.values(serverConfigs).map(config => config.serverConfig)
        );

        // Check each server
        for (const config of Object.values(serverConfigs)) {
            const server = service.getServer(config.id);
            if (!server) {
                throw new Error(`Server ${config.id} not found`);
            }

            // Should be able to list tools
            const tools = await server.listTools();
            expect(tools.length).toBeGreaterThan(0);

            // Server should be accessible
            await server.invokeTool(tools[0].name, {});
        }

        // After cleanup, tools should be inaccessible
        await service.cleanup();

        for (const config of Object.values(serverConfigs)) {
            const server = service.getServer(config.id);
            if (!server) continue;
            await expect(server.listTools()).rejects.toThrow();
        }
    }, 60000);
});