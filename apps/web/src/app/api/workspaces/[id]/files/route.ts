import { createFilesRoutes } from '@/lib/api/factories/files';

export const { GET, POST } = createFilesRoutes(true);
