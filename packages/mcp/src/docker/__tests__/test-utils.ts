// src/docker/__tests__/test-utils.ts
import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

export interface TestDirectory {
    path: string;
    type: 'filesystem' | 'git' | 'memory';
}

/**
 * Prepares test directories for different MCP servers
 */
export async function prepareTestDirectory(type: TestDirectory['type']): Promise<TestDirectory> {
    const dirPath = `/tmp/mcp-test-${type}-${Date.now()}`;
    await fs.mkdir(dirPath, { recursive: true });

    // Server-specific initialization
    switch (type) {
        case 'git':
            execSync('git init', { cwd: dirPath });
            execSync('git config --global init.defaultBranch main', { cwd: dirPath });
            execSync('git config --global user.email "test@example.com"', { cwd: dirPath });
            execSync('git config --global user.name "Test User"', { cwd: dirPath });
            await fs.writeFile(path.join(dirPath, 'README.md'), '# Test Repository');
            execSync('git add README.md', { cwd: dirPath });
            execSync('git commit -m "Initial commit"', { cwd: dirPath });
            break;

        case 'filesystem':
            // No special initialization needed
            break;
        case 'memory':
            await fs.writeFile(
                path.join(dirPath, 'memory.json'),
                JSON.stringify({
                    entities: [],
                    relations: []
                }) + '\n'  // Note: Add newline since server expects JSONL format
            );
            break;
    }

    return { path: dirPath, type };
}
