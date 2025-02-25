import { createToolsRoutes } from '@/lib/api/factories/createToolsRoutes';

/**
 * Route handlers for workspace-level active tools config
 */
export const { GET, POST } = createToolsRoutes(true);