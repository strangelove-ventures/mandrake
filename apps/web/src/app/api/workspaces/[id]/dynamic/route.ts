import { createDynamicContextRoutes } from '@/lib/api/factories/createDynamicContextRoutes';

/**
 * Route handlers for workspace-level dynamic contexts
 */
export const { GET, POST } = createDynamicContextRoutes(true);