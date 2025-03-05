'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ensureServicesReady } from './index';

/**
 * Wraps an API handler with service initialization
 * @param handler The API route handler function
 * @returns A wrapped handler that ensures services are ready
 */
export async function withServices<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
  req: NextRequest,
  ...args: T
): Promise<NextResponse> {
  try {
    // Ensure services are ready before proceeding
    await ensureServicesReady();
    
    // Call the original handler
    return await handler(req, ...args);
  } catch (error) {
    console.error('API services not ready:', error);
    
    // Return error response
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'API services are not ready. Please try again later.'
      }
    }, { status: 503 });
  }
}
