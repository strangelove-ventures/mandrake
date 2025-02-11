import { DockerMCPService } from '../docker';
import { ServerConfig } from '@mandrake/types';
import { logger } from '../logger';
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function createTestDirectory(name: string): Promise<string> {
    const dirPath = join(tmpdir(), `mcp-test-${name}-${Date.now()}`);
    await mkdir(dirPath, { recursive: true });
    return dirPath;
}

export async function removeTestDirectory(path: string): Promise<void> {
    await rm(path, { recursive: true, force: true });
}

export const testLogger = logger.child({ service: 'test' });

export async function setupTestServer(config: ServerConfig) {
    const service = new DockerMCPService(testLogger);
    await service.initialize([config]);
    return service;
}

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