import { NextRequest } from 'next/server';
import { createProviderRoutes } from '@/server/api/factories/models';

// Set the route to run on the server only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create route handlers with workspaceScoped = true
const { GET, PUT, DELETE } = createProviderRoutes(true);

// Export route handlers
export { GET, PUT, DELETE };
