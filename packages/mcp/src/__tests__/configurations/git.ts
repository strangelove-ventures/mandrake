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
        image: 'ghcr.io/strangelove-ventures/mcp/git:latest',
        command: [],
        execCommand: ['/bin/bash', '-c', 'source /app/.venv/bin/activate && mcp-server-git']
    },
    hooks: {
        beforeAll: async () => {
            const testDir = await createTestDirectory('git');
            console.log('Created test directory:', testDir);

            try {
                // Initialize git repo
                execSync('git init', { cwd: testDir });
                execSync('git config --local init.defaultBranch main', { cwd: testDir });
                execSync('git config --local user.email "test@example.com"', { cwd: testDir });
                execSync('git config --local user.name "Test User"', { cwd: testDir });

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
            } catch (err) {
                console.error('Error setting up git repo:', err);
                await removeTestDirectory(testDir);
                throw err;
            }
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