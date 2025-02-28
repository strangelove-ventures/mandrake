import { createServerConfigRoutes } from '@/lib/api/factories/tools';
import { handleApiError } from '@/lib/api/middleware/errorHandling';

const handlers = createServerConfigRoutes();

export const GET = handleApiError(handlers.GET);
export const PUT = handleApiError(handlers.PUT);
export const DELETE = handleApiError(handlers.DELETE);
