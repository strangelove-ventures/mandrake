import { createFilesRoutes } from '@/lib/api/factories/files';

export const { GET, PUT, DELETE } = createFilesRoutes(true);
