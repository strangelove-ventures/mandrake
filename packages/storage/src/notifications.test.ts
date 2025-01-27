import { ReadableStreamReadResult } from 'stream/web'
import { PrismaClient } from '@prisma/client'
import { DbConfig } from './db'
import { createSessionStream, SessionNotifier } from './notifications'
import { setupTestDatabase } from './test/db'

describe('notifications', () => {
    let testPrisma: PrismaClient
    let testConfig: DbConfig
    let cleanup: (() => Promise<void>) | undefined
    let notifier: SessionNotifier

    // Increase timeout for DB setup
    beforeAll(async () => {
        const db = await setupTestDatabase()
        cleanup = db.cleanup
        testPrisma = db.prisma
        testConfig = db.config
        notifier = new SessionNotifier(testConfig, testPrisma)
    }, 60000)

    afterAll(async () => {
        if (cleanup) {
            await cleanup()
        }
    }, 10000)

    it('should stream session changes via createSessionStream', async () => {
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
        const stream = await createSessionStream(session.id, testConfig, testPrisma)
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
        expect(value.id).toBe(session.id)

        // Release reader and cleanup
        await reader.cancel()
        await testPrisma.session.delete({ where: { id: session.id } })
        await testPrisma.workspace.delete({ where: { id: workspace.id } })
    }, 100000)

    it('should handle subscriptions via SessionNotifier', async () => {
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

        // Set up subscription
        const received: any[] = []
        const unsubscribe = await notifier.subscribe(session.id, (data) => {
            received.push(data)
        })

        // Update session to trigger notification
        await testPrisma.session.update({
            where: { id: session.id },
            data: { title: `Updated Title ${Date.now()}` }
        })

        // Wait for notification
        await new Promise((resolve) => setTimeout(resolve, 1000))

        expect(received.length).toBeGreaterThan(0)
        expect(received[0].id).toBe(session.id)

        // Cleanup
        unsubscribe()
        await testPrisma.session.delete({ where: { id: session.id } })
        await testPrisma.workspace.delete({ where: { id: workspace.id } })
    }, 100000)
})