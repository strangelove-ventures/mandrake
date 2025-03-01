import { createWorkspacesRoutes } from '@/lib/api/factories/workspaces';
import { handleApiError } from '@/lib/api/middleware/errorHandling';

const handlers = createWorkspacesRoutes();

export const GET = handleApiError(handlers.GET);
export const PUT = handleApiError(handlers.PUT);
export const DELETE = handleApiError(handlers.DELETE);
