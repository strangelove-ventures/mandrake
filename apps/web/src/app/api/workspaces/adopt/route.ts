"use server";
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // In a production environment, this would call the workspace factory
  // return createWorkspaceAdoptRoutes().POST(request);
  
  const body = await request.json();
  
  // Validate required fields
  if (!body.name || !body.path) {
    return NextResponse.json(
      { error: 'Name and path are required' },
      { status: 400 }
    );
  }
  
  // Create a new mock workspace (simulating adoption)
  const adoptedWorkspace = {
    id: `workspace-adopted-${Date.now()}`,
    name: body.name,
    description: body.description || '',
    path: body.path,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return NextResponse.json(adoptedWorkspace, { status: 201 });
}
