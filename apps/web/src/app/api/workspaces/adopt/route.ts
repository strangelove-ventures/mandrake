import { createWorkspaceAdoptRoutes } from '@/lib/api/factories/workspaces';
import { handleApiError } from '@/lib/api/middleware/errorHandling';

const handlers = createWorkspaceAdoptRoutes();

export const POST = handleApiError(handlers.POST);
