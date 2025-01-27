import { ReadableStreamReadResult } from 'stream/web'
import { PrismaClient } from '@prisma/client'
import { createSessionStream } from './notifications'
import { setupTestDatabase } from './test/db'

describe('notifications', () => {
    let testPrisma: PrismaClient
    let cleanup: (() => Promise<void>) | undefined

    // Increase timeout for DB setup
    beforeAll(async () => {
        const db = await setupTestDatabase()
        cleanup = db.cleanup
        testPrisma = db.prisma
    }, 60000) // 30 second timeout

    afterAll(async () => {
        if (cleanup) {
            await cleanup()
        }
    }, 10000) // 10 second timeout for cleanup

    it('should stream session changes', async () => {
        // Create test data
        const workspace = await testPrisma.workspace.create({
            data: {
                name: 'test workspace',
                description: 'test workspace'
            }
        })

        const session = await testPrisma.session.create({
            data: {
                workspaceId: workspace.id,
                title: 'Test Session'
            }
        })

        // Set up stream
        const stream = await createSessionStream(session.id)
        const reader = stream.getReader()

        // Update session to trigger stream
        await testPrisma.session.update({
            where: { id: session.id },
            data: { title: `Updated Title ${Date.now()}` }
        })

        // Wait for stream event with timeout
        const { value, done } = await Promise.race([
            reader.read(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Stream timeout')), 5000)
            )
        ]) as ReadableStreamReadResult<any>

        expect(done).toBe(false)
        expect(value).toBeDefined()

        // Parse the streamed data
        const data = JSON.parse(value)
        expect(data.id).toBe(session.id)

        // Release reader and cleanup
        await reader.cancel()
        await testPrisma.session.delete({ where: { id: session.id } })
        await testPrisma.workspace.delete({ where: { id: workspace.id } })
    }, 100000)
})