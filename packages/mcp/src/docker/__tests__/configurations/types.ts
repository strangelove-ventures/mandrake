import { ServerConfig } from '@mandrake/types';
import { DockerMCPService } from '../../service';

export interface ServerTestHooks {
    beforeAll?: () => Promise<void>;    // One-time setup
    beforeEach?: () => Promise<void>;   // Per-test setup
    afterEach?: () => Promise<void>;    // Per-test cleanup
    afterAll?: () => Promise<void>;     // One-time cleanup
    validate?: (service: DockerMCPService) => Promise<void>; // Basic validation
}

export interface ServerTestConfig {
    id: string;
    serverConfig: ServerConfig;
    hooks: ServerTestHooks;
    testDir?: string;
}