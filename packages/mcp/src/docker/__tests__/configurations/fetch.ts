import { ServerTestConfig } from './types';

export const fetchServerConfig: ServerTestConfig = {
    id: 'fetch',
    serverConfig: {
        id: 'fetch',
        name: `fetch-test-${Date.now()}`,
        image: 'mandrake-test/mcp-fetch:latest',
        command: [],
        execCommand: ['mcp-server-fetch']
    },
    hooks: {
        validate: async (service) => {
            const server = service.getServer('fetch');
            if (!server) throw new Error('Fetch server not found');

            // Test basic fetch operation with example.com
            const result = await server.invokeTool('fetch', {
                url: 'https://example.com',
                max_length: 1000
            });

            if (!result.content[0]?.text) {
                throw new Error('Invalid fetch response');
            }
            if (!(result.content[0].text as string).includes('Contents of https://example.com')) {
                throw new Error('Unexpected fetch response format');
            }
        }
    }
};