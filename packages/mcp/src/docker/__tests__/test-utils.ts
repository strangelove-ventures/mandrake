import fs from 'fs/promises';
import { DockerMCPService } from '../service';
import { ServerConfig } from '@mandrake/types';
import { logger } from '../../logger';

export const testLogger = logger.child({ service: 'test' });

export async function setupTestServer(config: ServerConfig) {
    const service = new DockerMCPService(testLogger);
    await service.initialize([config]);
    return service;
}
export async function createTestDirectory(name: string): Promise<string> {
    const dirPath = `/tmp/mcp-test-${name}-${Date.now()}`;
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
}

export async function removeTestDirectory(path: string): Promise<void> {
    await fs.rm(path, { recursive: true, force: true });
}
