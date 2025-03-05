'use server';

import { NextResponse } from 'next/server';

/**
 * Creates a standard API success response
 * @param data Response data
 * @param statusCode HTTP status code
 * @returns Formatted NextResponse
 */
export function createApiResponse<T>(data: T, statusCode: number = 200): NextResponse {
  return NextResponse.json({
    success: true,
    data
  }, { status: statusCode });
}

/**
 * Creates a standard API error response
 * @param error Error object or message
 * @param statusCode HTTP status code
 * @returns Formatted NextResponse
 */
export function createApiErrorResponse(
  error: { code: string; message: string } | string,
  statusCode: number = 500
): NextResponse {
  const errorData = typeof error === 'string' 
    ? { code: 'ERROR', message: error } 
    : error;
  
  return NextResponse.json({
    success: false,
    error: errorData
  }, { status: statusCode });
}

/**
 * Creates a streaming API response
 * @param stream ReadableStream to return
 * @returns Streaming Response
 */
export function createApiStreamResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}

/**
 * Creates a No Content response (204)
 * @returns NextResponse with 204 status
 */
export function createNoContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
