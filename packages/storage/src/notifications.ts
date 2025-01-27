import pkg from 'pg';
const { Client } = pkg;
import { prisma } from './index'
import { PrismaClient } from '@prisma/client'
import { DbConfig, devConfig } from './db'

export async function createSessionStream(
    sessionId: string,
    dbConfig: DbConfig,
    prismaClient: PrismaClient
) {
    const client = new Client({
        host: 'localhost',
        port: parseInt(dbConfig.port),
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database
    })

    await client.connect()

    return new ReadableStream({
        async start(controller) {
            try {
                await client.query('LISTEN session_updates')
                client.on('notification', async (msg) => {
                    const payload = JSON.parse(msg.payload!)
                    if (payload.sessionId === sessionId) {
                        const session = await prismaClient.session.findUnique({
                            where: { id: sessionId }
                        })
                        controller.enqueue(session)
                    }
                })
            } catch (error) {
                controller.error(error)
                client.end()
            }
        },
        cancel() {
            client.end()
        }
    })
}

export class SessionNotifier {
    private streams: Map<string, {
        stream: ReadableStream,
        reader: ReadableStreamDefaultReader
    }> = new Map()
    private subscribers: Map<string, Set<(data: any) => void>> = new Map()
    private dbConfig: DbConfig
    private prismaClient: PrismaClient

    constructor(dbConfig: DbConfig, prismaClient: PrismaClient) {
        this.dbConfig = dbConfig
        this.prismaClient = prismaClient
    }

    async subscribe(sessionId: string, callback: (data: any) => void) {
        if (!this.subscribers.has(sessionId)) {
            this.subscribers.set(sessionId, new Set())

            const stream = await createSessionStream(sessionId, this.dbConfig, this.prismaClient)
            const reader = stream.getReader()
            this.streams.set(sessionId, { stream, reader })

            // Start reading from stream
            this.readStream(reader, sessionId)
        }

        this.subscribers.get(sessionId)!.add(callback)

        return () => {
            const subs = this.subscribers.get(sessionId)
            if (subs) {
                subs.delete(callback)
                if (subs.size === 0) {
                    // Cleanup stream if no more subscribers
                    const streamData = this.streams.get(sessionId)
                    if (streamData) {
                        streamData.reader.cancel()
                        this.streams.delete(sessionId)
                    }
                    this.subscribers.delete(sessionId)
                }
            }
        }
    }

    private async readStream(reader: ReadableStreamDefaultReader, sessionId: string) {
        try {
            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                // Notify all subscribers
                const subs = this.subscribers.get(sessionId)
                if (subs) {
                    for (const callback of subs) {
                        callback(value)
                    }
                }
            }
        } catch (error) {
            console.error('Stream read error:', error)
        }
    }
}

// Export default instance
export const sessionNotifier = new SessionNotifier(devConfig, prisma)