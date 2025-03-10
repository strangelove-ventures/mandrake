import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to proxy requests to the backend
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  console.log(`API Proxy GET: /${params.path.join('/')}`);
  const targetUrl = `http://localhost:4000/${params.path.join('/')}${request.nextUrl.search}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`API Proxy Error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to fetch from backend' },
      { status: 500 }
    );
  }
}

/**
 * Handle POST requests
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  console.log(`API Proxy POST: /${params.path.join('/')}`);
  const targetUrl = `http://localhost:4000/${params.path.join('/')}`;
  
  try {
    const body = await request.json();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`API Proxy Error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to post to backend' },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT requests
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  console.log(`API Proxy PUT: /${params.path.join('/')}`);
  const targetUrl = `http://localhost:4000/${params.path.join('/')}`;
  
  try {
    const body = await request.json();
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`API Proxy Error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to put to backend' },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE requests
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  console.log(`API Proxy DELETE: /${params.path.join('/')}`);
  const targetUrl = `http://localhost:4000/${params.path.join('/')}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`API Proxy Error: ${error}`);
    return NextResponse.json(
      { error: 'Failed to delete from backend' },
      { status: 500 }
    );
  }
}