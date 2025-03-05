import { NextResponse } from 'next/server';

/**
 * Middleware to handle requests
 */
export function middleware() {
  // Just pass through all requests for now
  return NextResponse.next();
}

export const config = {
  // Only apply middleware to API routes
  matcher: '/api/:path*',
};
