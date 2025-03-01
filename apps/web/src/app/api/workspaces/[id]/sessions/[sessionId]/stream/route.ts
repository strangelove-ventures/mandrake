import { createSessionRoutes } from '@/lib/api/factories/sessions';

export const { POST } = createSessionRoutes({ workspace: 'id' });
