import { createPromptRoutes } from '@/lib/api/factories/createPromptRoutes';

/**
 * Route handlers for workspace-level prompt
 */
export const { GET, PUT } = createPromptRoutes(true);