import { createServerStatusRoutes } from '@/lib/api/factories/tools';
import { handleApiError } from '@/lib/api/middleware/errorHandling';

const handlers = createServerStatusRoutes();

export const GET = handleApiError(handlers.GET);
