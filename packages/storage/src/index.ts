import { PrismaClient } from '@prisma/client'

// Create Prisma client with Pulse extension
declare global {
    var prisma: PrismaClient | undefined;
}

export const prisma = new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma as unknown as PrismaClient;
}

// Export types from Prisma
export type {
    Workspace,
    Session,
    Round,
    Request,
    Response,
    Turn,
} from '@prisma/client';

// Export all operations
export * from './operations';
export * from './init';
export * from './db';