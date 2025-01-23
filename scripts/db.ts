import Docker from 'dockerode';
import path from 'path';
import * as fs from 'fs/promises';
import pkg from 'pg';
const { Client } = pkg;
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docker = new Docker();
const containerName = 'mandrake-postgres-dev';

const DB_CONFIG = {
    name: containerName,
    image: 'postgres:14-alpine',
    user: 'mandrake',
    password: 'devpassword',
    database: 'mandrake',
    port: '5432',
    dataDir: path.join(path.dirname(__dirname), 'testdb')
};

async function ensureDataDirectory() {
    try {
        await fs.mkdir(DB_CONFIG.dataDir, { recursive: true });
        console.log('Data directory ensured:', DB_CONFIG.dataDir);
    } catch (err) {
        console.error('Error creating data directory:', err);
        throw err;
    }
}

async function stopContainer() {
    try {
        const containers = await docker.listContainers({
            all: true,
            filters: { name: [containerName] }
        });

        for (const container of containers) {
            console.log('Stopping container:', containerName);
            const c = docker.getContainer(container.Id);
            await c.stop().catch(() => { });
            await c.remove();
        }
    } catch (err) {
        console.error('Error stopping container:', err);
        throw err;
    }
}

async function waitForDatabase(container: Docker.Container): Promise<boolean> {
    console.log('Waiting for database to be ready...');
    let client: pkg.Client | null = null;

    for (let i = 0; i < 30; i++) {
        try {
            const info = await container.inspect();
            if (!info.State.Running) {
                console.log('Container not running yet...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            // Try to get logs to see what's happening
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                tail: 10
            });
            
            const logsStr = logs.toString();
            if (logsStr.includes('database system is ready to accept connections')) {
                console.log('Database is accepting connections');
                // Additional pause to ensure everything is really ready
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Test the connection
                client = new Client({
                    host: 'localhost',
                    port: parseInt(DB_CONFIG.port),
                    database: DB_CONFIG.database,
                    user: DB_CONFIG.user,
                    password: DB_CONFIG.password
                });

                await client.connect();
                const result = await client.query('SELECT 1');
                await client.end();
                console.log('Database connection test successful');
                return true;
            }

            console.log(`Attempt ${i + 1}/30: Waiting for database to initialize...`);
        } catch (err) {
            if (client) {
                client.end().catch(console.error);
            }
            if (i === 29) {
                console.error('Final connection attempt failed:', err);
                throw err;
            }
            console.log(`Attempt ${i + 1}/30: Connection check failed`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}

async function startContainer() {
    try {
        await ensureImage();

        console.log('Creating new postgres container...');
        const container = await docker.createContainer({
            Image: DB_CONFIG.image,
            name: DB_CONFIG.name,
            Env: [
                `POSTGRES_DB=${DB_CONFIG.database}`,
                `POSTGRES_USER=${DB_CONFIG.user}`,
                `POSTGRES_PASSWORD=${DB_CONFIG.password}`
            ],
            ExposedPorts: {
                '5432/tcp': {}
            },
            HostConfig: {
                PortBindings: {
                    '5432/tcp': [{ HostPort: DB_CONFIG.port }]
                },
                Binds: [
                    `${DB_CONFIG.dataDir}:/var/lib/postgresql/data`
                ]
            }
        });

        console.log('Starting container...');
        await container.start();

        const isReady = await waitForDatabase(container);
        if (!isReady) {
            throw new Error('Database failed to become ready in time');
        }

        console.log('Database ready!');
        console.log(`Connection URL: postgresql://${DB_CONFIG.user}:${DB_CONFIG.password}@localhost:${DB_CONFIG.port}/${DB_CONFIG.database}`);

        // Create .env file for the storage package
        const envContent = `DATABASE_URL=postgresql://${DB_CONFIG.user}:${DB_CONFIG.password}@localhost:${DB_CONFIG.port}/${DB_CONFIG.database}`;
        await fs.writeFile('packages/storage/.env', envContent);
        console.log('Created .env file in storage package');

        const schemaExists = await checkSchema();
        if (!schemaExists) {
            await setupSchema();
        }
    } catch (err) {
        console.error('Error starting container:', err);
        throw err;
    }
}

async function pullImage() {
    console.log(`Pulling PostgreSQL image: ${DB_CONFIG.image}`);
    try {
        const stream = await docker.pull(DB_CONFIG.image);
        await new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err: any, result: any) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
        console.log('Pull complete');
    } catch (err) {
        console.error('Error pulling image:', err);
        throw err;
    }
}

async function ensureImage() {
    try {
        const images = await docker.listImages({
            filters: { reference: [DB_CONFIG.image] }
        });

        if (images.length === 0) {
            await pullImage();
        } else {
            console.log('PostgreSQL image already present');
        }
    } catch (err) {
        console.error('Error checking for image:', err);
        throw err;
    }
}

async function runPrismaCommand(command: string[]): Promise<void> {
    const env = {
        ...process.env,
        DATABASE_URL: `postgresql://${DB_CONFIG.user}:${DB_CONFIG.password}@localhost:${DB_CONFIG.port}/${DB_CONFIG.database}`
    };

    return new Promise((resolve, reject) => {
        console.log(`Running prisma ${command.join(' ')}...`);
        const prisma = spawn('npx', ['prisma', ...command], {
            cwd: 'packages/storage',  // Updated to new location
            env,
            stdio: 'inherit'
        });

        prisma.on('error', reject);
        prisma.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Prisma command failed with code ${code}`));
            }
        });
    });
}

async function checkSchema(): Promise<boolean> {
    try {
        await runPrismaCommand(['migrate', 'status']);
        return true;
    } catch (err) {
        return false;
    }
}

async function setupSchema() {
    try {
        // First generate the Prisma client
        await runPrismaCommand(['generate']);

        // Then run migrations
        await runPrismaCommand(['migrate', 'deploy']);

        console.log('Database schema setup complete');
    } catch (err) {
        console.error('Error setting up schema:', err);
        throw err;
    }
}

async function cleanDB() {
    await stopContainer();
    try {
        await fs.rm(DB_CONFIG.dataDir, { recursive: true, force: true });
        console.log('Database data cleaned');
    } catch (err) {
        console.error('Error cleaning database data:', err);
        throw err;
    }
}

// Handle command line arguments in ESM
const command = process.argv[2];
switch (command) {
    case 'start':
        startDB();
        break;
    case 'stop':
        stopContainer();
        break;
    case 'clean':
        cleanDB();
        break;
    default:
        console.log('Usage: npm run db [start|stop|clean]');
}

async function startDB() {
    await ensureDataDirectory();
    await stopContainer();
    await startContainer();
}