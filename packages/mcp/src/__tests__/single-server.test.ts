import { setupTestServer } from './test-utils';
import { serverConfigs } from './configurations';
import { DockerMCPService } from '../docker/service';

const serverName = process.env.TEST_SERVER;
if (!serverName) {
    console.error('Server name must be provided');
    process.exit(1);
}

const config = serverConfigs[serverName];
if (!config) {
    console.error(`No configuration found for server: ${serverName}`);
    process.exit(1);
}

describe(`Server Test: ${config.id}`, () => {
    let service: DockerMCPService;
    beforeAll(async () => {
        await config.hooks.beforeAll?.();
    });

    beforeEach(async () => {
        await config.hooks.beforeEach?.();
    });

    afterAll(async () => {
        await config.hooks.afterAll?.();
    });

    afterEach(async () => {
            if (service) {
        await service.cleanup();
    }
        await config.hooks.afterEach?.();
    });

    it('should initialize and run validation', async () => {
        service = await setupTestServer(config.serverConfig);
        await config.hooks.validate?.(service);
    }, 30000);  
});
