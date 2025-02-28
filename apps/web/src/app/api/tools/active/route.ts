import { createActiveConfigSetRoutes } from '@/lib/api/factories/tools';
import { handleApiError } from '@/lib/api/middleware/errorHandling';

const handlers = createActiveConfigSetRoutes();

export const GET = handleApiError(handlers.GET);
export const PUT = handleApiError(handlers.PUT);
