import { createToolsConfigRoutes } from '@/lib/api/factories/tools';
import { handleApiError } from '@/lib/api/middleware/errorHandling';

const handlers = createToolsConfigRoutes();

export const GET = handleApiError(handlers.GET);
export const POST = handleApiError(handlers.POST);
