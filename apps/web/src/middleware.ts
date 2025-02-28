import { NextRequest, NextResponse } from 'next/server';
import { ensureServicesReady } from '@/lib/api/init';

/**
 * Middleware to ensure services are initialized before handling API requests
 */
export async function middleware(req: NextRequest) {
  // Only apply to API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    try {
      // Wait for services to be initialized
      await ensureServicesReady();
      
      // Continue with the request
      return NextResponse.next();
    } catch (error) {
      console.error('Services not ready:', error);
      
      // Return error response
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'API services are not ready. Please try again later.'
          }
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }
  
  // Pass through to other routes
  return NextResponse.next();
}

export const config = {
  // Apply middleware to API routes
  matcher: '/api/:path*',
};
