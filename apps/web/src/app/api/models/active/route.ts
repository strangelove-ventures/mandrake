import { NextRequest } from 'next/server';
import { createActiveModelRoutes } from '@/server/api/factories/models';

// Set the route to run on the server only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create route handlers
const { GET, PUT } = createActiveModelRoutes();

// Export route handlers
export { GET, PUT };
