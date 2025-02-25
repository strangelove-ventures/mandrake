import { createDynamicContextRoutes } from '@/lib/api/factories/createDynamicContextRoutes';

/**
 * Route handlers for specific workspace-level dynamic context
 */
export const { GET, PUT, DELETE } = createDynamicContextRoutes(true);