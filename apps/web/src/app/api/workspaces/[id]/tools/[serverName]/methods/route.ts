import { createServerMethodsRoutes } from '@/lib/api/factories/tools';
import { handleApiError } from '@/lib/api/middleware/errorHandling';

const handlers = createServerMethodsRoutes(true);

export const GET = handleApiError(handlers.GET);
