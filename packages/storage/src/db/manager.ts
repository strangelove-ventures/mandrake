// scripts/db/manager.ts
import Docker from 'dockerode'
import { DbConfig } from './config'
import pkg from 'pg'
const { Client } = pkg
import path from 'path'
import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import { fileURLToPath } from 'url'

import type { Client as PgClient } from 'pg'

export class DatabaseManager {
    private docker: Docker

    constructor(private config: DbConfig) {
        this.docker = new Docker()
    }

    async ensureDataDirectory() {
        try {
            await fs.mkdir(this.config.dataDir, { recursive: true })
            console.log('Data directory ensured:', this.config.dataDir)
        } catch (err) {
            console.error('Error creating data directory:', err)
            throw err
        }
    }

    async stopContainer() {
        try {
            const containers = await this.docker.listContainers({
                all: true,
                filters: { name: [this.config.name] }
            })

            for (const container of containers) {
                console.log('Stopping container:', this.config.name)
                const c = this.docker.getContainer(container.Id)
                await c.stop().catch(() => { })
                await c.remove()
            }
        } catch (err) {
            console.error('Error stopping container:', err)
            throw err
        }
    }

    async setupDatabaseUser(container: Docker.Container): Promise<void> {
        const rootClient = new Client({
            host: 'localhost',
            port: parseInt(this.config.port),
            user: this.config.user,
            password: this.config.password
        })

        try {
            await rootClient.connect()

            await rootClient.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${this.config.user}') THEN
                        CREATE USER ${this.config.user} WITH PASSWORD '${this.config.password}' SUPERUSER;
                    END IF;
                END
                $$;
            `)

            await rootClient.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${this.config.database}') THEN
                        CREATE DATABASE ${this.config.database} OWNER ${this.config.user};
                    END IF;
                END
                $$;
            `)

            await rootClient.end()

            const dbClient = new Client({
                host: 'localhost',
                port: parseInt(this.config.port),
                user: 'postgres',
                database: this.config.database
            })

            await dbClient.connect()

            await dbClient.query(`
                DO $$ 
                DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                    END LOOP;
                END $$;
            `)

            await dbClient.query(`
                GRANT ALL PRIVILEGES ON DATABASE ${this.config.database} TO ${this.config.user};
                GRANT ALL PRIVILEGES ON SCHEMA public TO ${this.config.user};
                GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${this.config.user};
                GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${this.config.user};
                GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO ${this.config.user};
                ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                    GRANT ALL ON TABLES TO ${this.config.user};
                ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                    GRANT ALL ON SEQUENCES TO ${this.config.user};
                ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                    GRANT ALL ON FUNCTIONS TO ${this.config.user};
                ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                    GRANT ALL ON TYPES TO ${this.config.user};
            `)

            await dbClient.end()

            console.log('Database user and permissions set up successfully')
        } catch (err) {
            console.error('Error setting up database user:', err)
            throw err
        }
    }

    async waitForDatabase(container: Docker.Container): Promise<boolean> {
        console.log('Waiting for database to be ready...')
        let client: PgClient | null = null

        for (let i = 0; i < 40; i++) {
            try {
                const info = await container.inspect()
                if (!info.State.Running) {
                    console.log('Container not running yet...')
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    continue
                }

                const logs = await container.logs({
                    stdout: true,
                    stderr: true,
                    tail: 10
                })

                const logsStr = logs.toString()
                if (logsStr.includes('database system is ready to accept connections')) {
                    console.log('Database is accepting connections')
                    await new Promise(resolve => setTimeout(resolve, 2000))

                    client = new Client({
                        host: 'localhost',
                        port: parseInt(this.config.port),
                        database: this.config.database,
                        user: this.config.user,
                        password: this.config.password
                    })

                    await client.connect()
                    await client.query('SELECT 1')
                    await client.end()
                    console.log('Database connection test successful')
                    return true
                }

                console.log(`Attempt ${i + 1}/40: Waiting for database to initialize...`)
            } catch (err) {
                if (client) {
                    client.end().catch(console.error)
                }
                if (i === 29) {
                    console.error('Final connection attempt failed:', err)
                    throw err
                }
                console.log(`Attempt ${i + 1}/30: Connection check failed. Error:`, (err as Error).message)
            }
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
        return false
    }

    async startContainer() {
        try {
            await this.ensureImage(this.config.image)

            console.log('Creating new postgres container...')
            const container = await this.docker.createContainer({
                Image: this.config.image,
                name: this.config.name,
                Env: [
                    `POSTGRES_DB=${this.config.database}`,
                    `POSTGRES_USER=${this.config.user}`,
                    `POSTGRES_PASSWORD=${this.config.password}`,
                    'POSTGRES_HOST_AUTH_METHOD=trust'
                ],
                ExposedPorts: {
                    '5432/tcp': {}
                },
                HostConfig: {
                    PortBindings: {
                        '5432/tcp': [{ HostPort: this.config.port }]
                    },
                    Binds: [
                        `${this.config.dataDir}:/var/lib/postgresql/data`
                    ]
                }
            })

            console.log('Starting container...')
            await container.start()

            const isReady = await this.waitForDatabase(container)
            if (!isReady) {
                throw new Error('Database failed to become ready in time')
            }

            await this.setupDatabaseUser(container)

            console.log('Database ready!')
            console.log(`Connection URL: ${this.config.connectionUrl}`)

            await this.setupSchema()

            return container
        } catch (err) {
            console.error('Error starting container:', err)
            throw err
        }
    }

    private async pullImage(image: string) {
        console.log(`Pulling image: ${image}`)
        try {
            const stream = await this.docker.pull(image)
            await new Promise((resolve, reject) => {
                this.docker.modem.followProgress(stream, (err: any, result: any) => {
                    if (err) reject(err)
                    else resolve(result)
                })
            })
            console.log('Pull complete:', image)
        } catch (err) {
            console.error('Error pulling image:', err)
            throw err
        }
    }


    private async ensureImage(image: string) {
        try {
            const images = await this.docker.listImages({
                filters: { reference: [image] }
            })

            if (images.length === 0) {
                await this.pullImage(image)
            } else {
                console.log('Image already present:', image)
            }
        } catch (err) {
            console.error('Error checking for image:', err)
            throw err
        }
    }

    async runPrismaCommand(command: string[]): Promise<void> {
        try {
            const nodeImage = 'node:18-alpine'
            await this.ensureImage(nodeImage)

            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);

            const storagePath = path.dirname(path.dirname(path.dirname(__dirname)))
            const prismaPath = path.join(storagePath, 'storage', 'prisma')

            console.log('Mounting prisma directory:', prismaPath)

            const nodeContainer = await this.docker.createContainer({
                Image: nodeImage,
                Cmd: [
                    '/bin/sh',
                    '-c',
                    `cd /app && npm install prisma && npx prisma ${command.join(' ')} --schema=/app/prisma/schema.prisma`
                ],
                Env: [
                    `DATABASE_URL=postgresql://${this.config.user}:${this.config.password}@host.docker.internal:${this.config.port}/${this.config.database}`
                ],
                WorkingDir: '/app',
                HostConfig: {
                    Binds: [
                        `${prismaPath}:/app/prisma`
                    ]
                }
            })

            // Start container
            await nodeContainer.start()

            // Wait for container to finish
            const waitResult = await nodeContainer.wait()

            // Get logs for debugging
            const logStream = await nodeContainer.logs({
                follow: true,
                stdout: true,
                stderr: true
            })

            let logOutput = ''
            for await (const chunk of logStream) {
                logOutput += chunk
            }

            if (waitResult.StatusCode !== 0) {
                throw new Error(`Prisma command failed with status ${waitResult.StatusCode}. Logs: ${logOutput}`)
            }

            await nodeContainer.remove()

        } catch (err) {
            console.error('Error running prisma command:', err)
            throw err
        }
    }

    async checkSchema(): Promise<boolean> {
        try {
            await this.runPrismaCommand(['migrate', 'status'])
            return true
        } catch (err) {
            return false
        }
    }

    async setupSchema() {
        try {
            await this.runPrismaCommand(['generate'])
            await this.runPrismaCommand(['migrate', 'deploy'])
            console.log('Database schema setup complete')
        } catch (err) {
            console.error('Error setting up schema:', err)
            throw err
        }
    }

    async cleanDb() {
        await this.stopContainer()
        try {
            await fs.rm(this.config.dataDir, { recursive: true, force: true })
            console.log('Database data cleaned')
        } catch (err) {
            console.error('Error cleaning database data:', err)
            throw err
        }
    }


    async start() {
        await this.ensureDataDirectory()
        await this.stopContainer()
        await this.startContainer()
    }
}