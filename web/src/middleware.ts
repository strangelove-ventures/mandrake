import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware will proxy SSE requests properly
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if this is a streaming request
  if (pathname.includes('/api/system/streaming/') || (pathname.includes('/api/workspaces/') && pathname.includes('/streaming/'))) {
    // Clone the request and add the necessary headers
    const newRequest = new Request(request.url, {
      method: request.method,
      headers: new Headers({
        ...Object.fromEntries(request.headers),
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }),
      body: request.body,
      redirect: request.redirect,
    });
    
    // Return the modified request
    return NextResponse.next({
      request: newRequest,
    });
  }
  
  return NextResponse.next();
}

// Only apply this middleware to API routes that involve streaming
export const config = {
  matcher: ['/api/system/streaming/:path*', '/api/workspaces/:workspace/streaming/:path*'],
};
