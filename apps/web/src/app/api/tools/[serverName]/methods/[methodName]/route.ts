import { createExecuteMethodRoutes } from '@/lib/api/factories/tools';
import { handleApiError } from '@/lib/api/middleware/errorHandling';

const handlers = createExecuteMethodRoutes();

export const POST = handleApiError(handlers.POST);
