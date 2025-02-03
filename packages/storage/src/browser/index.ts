// Browser-safe exports for storage package
import { PrismaClient } from '@prisma/client';
export { sessionNotifier } from './session-notifier';

// Re-export Prisma client for browser use
export const prisma = new PrismaClient();