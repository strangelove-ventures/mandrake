import { createModelRoutes } from '@/lib/api/factories/createModelRoutes';

/**
 * Route handlers for specific workspace-level model
 */
export const { GET, PUT, DELETE } = createModelRoutes(true);