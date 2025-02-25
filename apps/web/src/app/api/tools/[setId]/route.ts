import { createToolsRoutes } from '@/lib/api/factories/createToolsRoutes';

/**
 * Route handlers for specific system-level tool config set
 */
export const { GET, PUT, DELETE } = createToolsRoutes();