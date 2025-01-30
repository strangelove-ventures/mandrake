import { ServerTestConfig } from './types';
import { createTestDirectory, removeTestDirectory } from '../test-utils';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

export const gitServerConfig: ServerTestConfig = {
    id: 'git',
    serverConfig: {
        id: 'git',
        name: `git-test-${Date.now()}`,
        image: 'mandrake-test/mcp-git:latest',
        command: [],
        execCommand: ['mcp-server-git']
    },
    hooks: {
        beforeAll: async () => {
            const testDir = await createTestDirectory('git');

            // Initialize git repo
            execSync('git init', { cwd: testDir });
            execSync('git config --global init.defaultBranch main', { cwd: testDir });
            execSync('git config --global user.email "test@example.com"', { cwd: testDir });
            execSync('git config --global user.name "Test User"', { cwd: testDir });

            // Create initial commit
            await fs.writeFile(path.join(testDir, 'README.md'), '# Test Repository');
            execSync('git add README.md', { cwd: testDir });
            execSync('git commit -m "Initial commit"', { cwd: testDir });

            gitServerConfig.testDir = testDir;
            gitServerConfig.serverConfig.volumes = [{
                source: testDir,
                target: '/workspace',
                mode: 'rw'
            }];
        },
        afterAll: async () => {
            if (gitServerConfig.testDir) {
                await removeTestDirectory(gitServerConfig.testDir);
            }
        },
        validate: async (service) => {
            const server = service.getServer('git');
            if (!server) throw new Error('Git server not found');

            const statusResult = await server.invokeTool('git_status', {
                repo_path: '/workspace'
            });

            if (!statusResult.content[0]?.text) {
                throw new Error('Invalid git_status response');
            }
            if (!(statusResult.content[0]?.text as string).includes('On branch main')) {
                throw new Error('Git repo not properly initialized');
            }
        }
    }
};