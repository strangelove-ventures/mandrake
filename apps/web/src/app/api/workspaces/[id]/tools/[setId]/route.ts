import { createToolsRoutes } from '@/lib/api/factories/createToolsRoutes';

/**
 * Route handlers for specific workspace-level tool config set
 */
export const { GET, POST, PUT, DELETE } = createToolsRoutes(true);