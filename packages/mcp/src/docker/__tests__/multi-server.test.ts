// packages/mcp/src/docker/__tests__/integration/multi-server.test.ts
import { DockerMCPService } from '../service';
import { serverConfigs } from './configurations';
import { testLogger } from './test-utils';

describe('Multi Server Tests', () => {
    let service: DockerMCPService;

    beforeAll(async () => {
        // Run all server beforeAll hooks
        await Promise.all(
            Object.values(serverConfigs).map(config =>
                config.hooks.beforeAll?.()
            )
        );
    });

    afterAll(async () => {
        // Run all server afterAll hooks
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
        // Run all server afterEach hooks
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

        // Run each server's validation
        for (const config of Object.values(serverConfigs)) {
            testLogger.info(`Validating ${config.id} server`);
            await config.hooks.validate?.(service);
        }
    }, 60000);
});