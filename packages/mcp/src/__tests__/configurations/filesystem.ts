import { ServerTestConfig } from './types';
import { createTestDirectory, removeTestDirectory } from '../test-utils';

export const filesystemServerConfig: ServerTestConfig = {
    id: 'filesystem',
    serverConfig: {
        id: 'filesystem',
        name: `filesystem-test-${Date.now()}`,
        image: 'mandrake-test/mcp-filesystem:latest',
        command: ['/data'],
        execCommand: ['/app/dist/index.js','/data']
    },
    hooks: {
        beforeAll: async () => {
            const testDir = await createTestDirectory('filesystem');

            filesystemServerConfig.testDir = testDir;
            filesystemServerConfig.serverConfig.volumes = [{
                source: testDir,
                target: '/data'
            }];
        },
        afterAll: async () => {
            if (filesystemServerConfig.testDir) {
                await removeTestDirectory(filesystemServerConfig.testDir);
            }
        },
        validate: async (service) => {
            const server = service.getServer('filesystem');
            if (!server) throw new Error('Filesystem server not found');

            const listResult = await server.invokeTool('list_directory', {
                path: '/'
            });

            if (!listResult.content[0]?.text) {
                throw new Error('Invalid list_directory response');
            }
        }
    }
};