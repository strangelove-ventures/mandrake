// Browser-safe exports for storage
import { PrismaClient } from '@prisma/client';

// Re-export only the Prisma client for browser use
export const prisma = new PrismaClient();

// Re-export type definitions
export type * from '@prisma/client';