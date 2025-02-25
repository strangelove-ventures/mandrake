import { createModelRoutes } from '@/lib/api/factories/createModelRoutes';

/**
 * Route handlers for specific system-level model
 */
export const { GET, PUT, DELETE } = createModelRoutes();