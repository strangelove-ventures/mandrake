import { ServerTestConfig } from './types';
import { createTestDirectory, removeTestDirectory } from '../test-utils';
import fs from 'fs/promises';
import path from 'path';

export const memoryServerConfig: ServerTestConfig = {
    id: 'memory',
    serverConfig: {
        id: 'memory',
        name: `memory-test-${Date.now()}`,
        image: 'mandrake-test/mcp-memory:latest',
        command: ['node', '/app/dist/index.js'],
        execCommand: ['node', '/app/dist/index.js']
    },
    hooks: {
        beforeAll: async () => {
            const testDir = await createTestDirectory('memory');

            await fs.writeFile(
                path.join(testDir, 'memory.json'),
                JSON.stringify({
                    entities: [],
                    relations: []
                }) + '\n'
            );

            memoryServerConfig.testDir = testDir;
            memoryServerConfig.serverConfig.volumes = [{
                source: testDir,
                target: '/app/data',
                mode: 'rw'
            }];
        },
        afterEach: async () => {
            await fs.writeFile(
                path.join(memoryServerConfig.testDir!, 'memory.json'),
                JSON.stringify({
                    entities: [],
                    relations: []
                }) + '\n'
            );
        },
        afterAll: async () => {
            if (memoryServerConfig.testDir) {
                await removeTestDirectory(memoryServerConfig.testDir);
            }
        },
        validate: async (service) => {
            const server = service.getServer('memory');
            if (!server) throw new Error('Memory server not found');

            const readResult = await server.invokeTool('read_graph', {});
            if (!readResult.content[0]?.text) {
                throw new Error('Invalid read_graph response');
            }

            const graph = JSON.parse(readResult.content[0].text as string);
            if (!Array.isArray(graph.entities) || !Array.isArray(graph.relations)) {
                throw new Error('Invalid graph structure');
            }
        }
    }
};