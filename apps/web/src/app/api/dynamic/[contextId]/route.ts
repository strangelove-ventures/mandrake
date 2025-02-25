import { createDynamicContextRoutes } from '@/lib/api/factories/createDynamicContextRoutes';

/**
 * Route handlers for specific system-level dynamic context
 */
export const { GET, PUT, DELETE } = createDynamicContextRoutes();