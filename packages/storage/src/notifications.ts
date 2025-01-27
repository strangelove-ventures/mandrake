import pkg from 'pg';
import { prisma } from './index'
const { Client } = pkg;
import { PrismaClient } from '@prisma/client'
import { DbConfig } from './db'


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