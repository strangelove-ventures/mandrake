import { Client } from 'pg'
import { prisma } from './index'

export async function createSessionStream(sessionId: string) {
    const client = new Client({
        host: 'localhost',
        port: 5433,  // Match our test DB port
        user: 'postgres',
        password: 'password',
        database: 'mandrake_test'
    })

    await client.connect()

    // Create a readable stream for the notifications
    return new ReadableStream({
        async start(controller) {
            try {
                // Listen for notifications for this session
                await client.query('LISTEN session_updates')

                // Handle notifications
                client.on('notification', async (msg) => {
                    const payload = JSON.parse(msg.payload!)
                    if (payload.sessionId === sessionId) {
                        // Get the updated session data
                        const session = await prisma.session.findUnique({
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