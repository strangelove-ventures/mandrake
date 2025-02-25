import { createModelRoutes } from '@/lib/api/factories/createModelRoutes';

/**
 * Route handlers for workspace-level models
 */
export const { GET, POST } = createModelRoutes(true);