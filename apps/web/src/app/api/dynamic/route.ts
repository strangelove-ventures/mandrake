import { createDynamicContextRoutes } from '@/lib/api/factories/createDynamicContextRoutes';

/**
 * Route handlers for system-level dynamic contexts
 */
export const { GET, POST } = createDynamicContextRoutes();