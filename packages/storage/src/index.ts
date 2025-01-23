import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
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
export * from './mapping';
export * from './init';