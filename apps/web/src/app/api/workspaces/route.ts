import { NextResponse } from 'next/server';

// Set the route to run on the server only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mock data for testing the UI while developing
const mockWorkspaces = [
  {
    id: 'workspace-1',
    name: 'Example Project',
    description: 'A sample workspace for testing',
    path: '/home/user/.mandrake/workspaces/example-project',
    createdAt: '2023-01-01T12:00:00Z',
    updatedAt: '2023-01-02T14:30:00Z',
  },
  {
    id: 'workspace-2',
    name: 'Documentation',
    description: 'Project documentation and guides',
    path: '/home/user/.mandrake/workspaces/documentation',
    createdAt: '2023-02-15T09:45:00Z',
    updatedAt: '2023-02-16T11:20:00Z',
  },
];

export async function GET() {
  // For now, return mock data
  // In production, this would connect to the real service
  return NextResponse.json(mockWorkspaces);
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // Create a new mock workspace
  const newWorkspace = {
    id: `workspace-${Date.now()}`,
    name: body.name,
    description: body.description || '',
    path: body.path || `/home/user/.mandrake/workspaces/${body.name.toLowerCase().replace(/\s+/g, '-')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return NextResponse.json(newWorkspace, { status: 201 });
}
