import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SERVER_CONFIG } from './server-configs.js';

const execAsync = promisify(exec);

async function buildServer(repoPath, name) {
    const tag = `mandrake-test/mcp-${name}:latest`;
    const serverPath = path.join(repoPath, 'src', name);
    const dockerfile = path.join(serverPath, 'Dockerfile');

    process.stdout.write(`Building ${name}... `);
    try {
        let buildCmd = `docker build -t ${tag} -f ${dockerfile}`;

        const config = SERVER_CONFIG[name];

        // Use either specified context path or repo root
        const context = config?.contextPath ?
            path.join(repoPath, config.contextPath) :
            repoPath;

        // Add any file copy mounts
        if (config?.copyFiles) {
            for (const [src, dest] of Object.entries(config.copyFiles)) {
                const source = path.join(serverPath, src);
                buildCmd += ` --mount=type=bind,source=${source},target=${dest}`;
            }
        }

        buildCmd += ` ${context}`;

        await execAsync(buildCmd);
        process.stdout.write('✓\n');
        return true;
    } catch (err) {
        process.stdout.write('✗\n');
        if (process.env.DEBUG) {
            console.error(err);
        }
        return false;
    }
}

async function buildAllServers(repoPath) {
    const srcPath = path.join(repoPath, 'src');
    const entries = await fs.readdir(srcPath, { withFileTypes: true });

    const servers = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

    console.log(`Found ${servers.length} servers to build\n`);

    let success = 0;
    let failed = 0;

    for (const server of servers) {
        const didBuild = await buildServer(repoPath, server);
        didBuild ? success++ : failed++;
    }

    console.log(`\nBuild complete: ${success} succeeded, ${failed} failed`);
}

const repoPath = process.argv[2];
if (!repoPath) {
    console.error('Please provide path to servers repo');
    process.exit(1);
}

buildAllServers(repoPath).catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});