import { NextResponse } from 'next/server';

// Set the route to run on the server only
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Mock data matching the list endpoint
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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // For now, return mock data
  // In production, this would connect to the real service
  const workspace = mockWorkspaces.find(w => w.id === params.id);
  
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }
  
  return NextResponse.json(workspace);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const workspace = mockWorkspaces.find(w => w.id === params.id);
  
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }
  
  const body = await request.json();
  
  // Update mock workspace
  const updatedWorkspace = {
    ...workspace,
    name: body.name || workspace.name,
    description: body.description !== undefined ? body.description : workspace.description,
    path: body.path || workspace.path,
    updatedAt: new Date().toISOString(),
  };
  
  return NextResponse.json(updatedWorkspace);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const workspace = mockWorkspaces.find(w => w.id === params.id);
  
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  }
  
  // In a real implementation, we would delete the workspace
  // For mock implementation, we'll just return success
  
  return NextResponse.json({ success: true });
}
