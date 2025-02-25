import { createPromptRoutes } from '@/lib/api/factories/createPromptRoutes';

/**
 * Route handlers for system-level prompt
 */
export const { GET, PUT } = createPromptRoutes();