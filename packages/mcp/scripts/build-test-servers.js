// packages/mcp/scripts/build-test-servers.js
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path'

const execAsync = promisify(exec);

async function buildServer(serverPath, name) {
    const tag = `mandrake-test/mcp-${name}:latest`;
    const dockerfilePath = path.join(serverPath, 'Dockerfile');

    console.log(`Building ${name}...`);
    try {
        await execAsync(`docker build -t ${tag} -f ${dockerfilePath} ${serverPath}`);
        console.log(`Built ${tag} successfully`);
    } catch (err) {
        console.error(`Failed to build ${name}:`, err);
    }
}

async function buildAllServers(repoPath) {
    const srcPath = path.join(repoPath, 'src');
    const entries = await fs.readdir(srcPath, { withFileTypes: true });

    const servers = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

    console.log('Found servers:', servers);

    for (const server of servers) {
        await buildServer(path.join(srcPath, server), server);
    }
}

// Get path from command line
const repoPath = process.argv[2];
if (!repoPath) {
    console.error('Please provide path to servers repo');
    process.exit(1);
}

buildAllServers(repoPath)
    .catch(console.error);