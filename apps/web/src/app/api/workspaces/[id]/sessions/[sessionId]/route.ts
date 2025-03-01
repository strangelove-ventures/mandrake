import { createSessionRoutes } from '@/lib/api/factories/sessions';

export const { GET, PUT, DELETE } = createSessionRoutes({ workspace: 'id' });
