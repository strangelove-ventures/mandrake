import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to proxy requests to the backend
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  console.log(`API Proxy GET: /${params.path.join('/')}`);
  const targetUrl = `http://localhost:4000/${params.path.join('/')}${request.nextUrl.search