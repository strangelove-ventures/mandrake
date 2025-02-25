import { createToolsRoutes } from '@/lib/api/factories/createToolsRoutes';

/**
 * Route handlers for workspace-level tools
 */
export const { GET } = createToolsRoutes(true);