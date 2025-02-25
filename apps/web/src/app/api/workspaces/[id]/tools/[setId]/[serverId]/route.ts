import { createToolsRoutes } from '@/lib/api/factories/createToolsRoutes';

/**
 * Route handlers for specific workspace-level server config
 */
export const { GET, POST, PUT, DELETE } = createToolsRoutes(true);