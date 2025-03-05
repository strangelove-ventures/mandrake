import { NextRequest } from 'next/server';
import { createModelRoutes } from '@/server/api/factories/models';

// Set the route to run on the server only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create route handlers with workspaceScoped = true
const { GET, POST, PUT, DELETE } = createModelRoutes(true);

// Export route handlers
export { GET, POST, PUT, DELETE };
