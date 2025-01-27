import { DbConfig, DatabaseManager } from '../db/index'
import { PrismaClient } from '@prisma/client'
import path from 'path'

// Create test config
const TEST_CONFIG = new DbConfig(
    'mandrake-postgres-test',
    'postgres:14-alpine',
    'postgres',
    'password',
    'mandrake_test',
    '5433',
    path.join(process.cwd(), 'testdb')
)

export async function setupTestDatabase() {
    const dbManager = new DatabaseManager(TEST_CONFIG)
    const container = await dbManager.startContainer()
    process.env.DATABASE_URL = `postgresql://${TEST_CONFIG.user}:${TEST_CONFIG.password}@localhost:${TEST_CONFIG.port}/${TEST_CONFIG.database}`

    const testPrisma = new PrismaClient({
        datasources: {
            db: {
                url: `postgresql://${TEST_CONFIG.user}:${TEST_CONFIG.password}@localhost:${TEST_CONFIG.port}/${TEST_CONFIG.database}`
            }
        }
    })

    return {
        prisma: testPrisma,
        config: TEST_CONFIG,
        async cleanup() {
            await dbManager.cleanDb()
        }
    }
}